import apiClient from '../lib/apiClient';
import majorRepository from '../repositories/majorRepository';
import { mapSubjectsToBackendPayload } from '../utils/subjectMapping';
import { buildClusterHierarchyGraph } from '../utils/clusterGraphUtils';
import config from '../config/config';

export const NODE_LAYOUT_SLOTS = [
  { x: 45, y: 30, w: 135, h: 75 },
  { x: 245, y: 20, w: 125, h: 70 },
  { x: 25, y: 175, w: 145, h: 78 },
  { x: 240, y: 205, w: 130, h: 72 },
  { x: 130, y: 350, w: 140, h: 75 },
  { x: 50, y: 485, w: 135, h: 75 },
];

/**
 * Mentransformasikan array MajorNode ke format visual node UI sederhana (Legacy mapping).
 */
export function mapMajorNodesToUi(nodes = []) {
  if (!Array.isArray(nodes)) return [];

  return nodes.map((node, index) => {
    const slot = NODE_LAYOUT_SLOTS[index] || {
      x: 100,
      y: 100 + index * 120,
      w: 130,
      h: 75,
    };

    return {
      id: node.id || `node-${index}`,
      type: 'platform',
      position: { x: slot.x, y: slot.y },
      data: {
        id: node.id,
        label: node.major_name,
        color: node.circle_color,
        childId: node.child_id,
        index,
        raw: node,
      },
      style: {
        width: slot.w,
        height: slot.h,
        background: 'transparent',
        border: 'none',
        boxShadow: 'none',
        padding: 0,
      },
    };
  });
}

/**
 * Melakukan fetch rekomendasi rumpun keilmuan dan jurusan dengan SSE Streaming.
 * 1. Panggil SSE stream POST /api/v1/clusters/recommend-stream.
 * 2. Emisi progres status, node cluster, dan node major secara real-time.
 * 3. Simpan cluster dan major ke IndexedDB via majorRepository.saveClustersAndMajors.
 * 4. Fallback 1: Jika SSE gagal/terputus, otomatis memanggil fallback sinkron POST /api/v1/clusters/recommend.
 * 5. Fallback 2: Jika jaringan offline, membaca data lokal tersimpan dari IndexedDB.
 *
 * @param {object} params
 * @param {string} params.minat - Teks deskripsi keminatan siswa
 * @param {object} params.nilai - Nilai mata pelajaran siswa
 * @param {Function} [params.onStatus] - Callback saat menerima status progres
 * @param {Function} [params.onCluster] - Callback saat menerima node cluster
 * @param {Function} [params.onMajor] - Callback saat menerima node jurusan
 * @param {AbortSignal} [params.signal] - AbortSignal untuk pembatalan request
 * @returns {Promise<{ success: boolean, clusters: Array, majors: Array, data: Array, mappedNodes: Array, mappedEdges: Array, nodes: Array, edges: Array, fromCache: boolean, error: string|null }>}
 */
export async function fetchRecommendedClustersStream({
  minat,
  nilai,
  onStatus,
  onCluster,
  onMajor,
  signal,
}) {
  const sanitizedNilai = mapSubjectsToBackendPayload(nilai);
  const payload = { minat, nilai: sanitizedNilai };

  const baseUrl = config.apiBaseUrl.replace(/\/+$/, '');
  const streamUrl = `${baseUrl}/api/v1/clusters/recommend-stream`;

  const clusters = [];
  const majors = [];
  let streamSucceeded = false;

  try {
    const response = await fetch(streamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (response.ok && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processJsonLine = (jsonStr) => {
        let parsed;
        try {
          parsed = JSON.parse(jsonStr);
          if (!parsed || !parsed.type) return;

          if (parsed.type === 'status' && parsed.data) {
            onStatus?.(parsed.data);
          } else if (parsed.type === 'cluster' && parsed.data) {
            const clusterNode = parsed.data;
            if (!clusters.some((c) => c.id === clusterNode.id)) {
              clusters.push(clusterNode);
            }
            onCluster?.(clusterNode);
          } else if (parsed.type === 'major' && parsed.data) {
            const majorNode = parsed.data;
            if (!majors.some((m) => m.id === majorNode.id)) {
              majors.push(majorNode);
            }
            onMajor?.(majorNode);
          } else if (parsed.type === 'done') {
            streamSucceeded = true;
          } else if (parsed.type === 'error') {
            throw new Error(parsed.data?.message || 'Terjadi kesalahan pada stream backend');
          }
        } catch (err) {
          if (parsed?.type === 'error') throw err;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);

            if (line.startsWith('data:')) {
              processJsonLine(line.slice(5).trim());
            }
          }
        }

        if (done) {
          if (buffer.trim().startsWith('data:')) {
            processJsonLine(buffer.trim().slice(5).trim());
          }
          break;
        }
      }

      if (clusters.length > 0 && majors.length > 0) {
        streamSucceeded = true;
      }
    }
  } catch (streamError) {
    console.warn('SSE Streaming kendala, beralih ke sync fallback:', streamError?.message);
  }

  // Jika streaming sukses menghasilkan data
  if (streamSucceeded && (clusters.length > 0 || majors.length > 0)) {
    await majorRepository.saveClustersAndMajors({ clusters, majors });
    const hierarchy = buildClusterHierarchyGraph({ clusters, majors });

    return {
      success: true,
      clusters,
      majors,
      data: majors,
      mappedNodes: hierarchy.nodes,
      mappedEdges: hierarchy.edges,
      nodes: hierarchy.nodes,
      edges: hierarchy.edges,
      fromCache: false,
      error: null,
    };
  }

  // ── FALLBACK 1: Endpoint Sinkron POST /api/v1/clusters/recommend ──
  try {
    const syncRes = await apiClient.post('/api/v1/clusters/recommend', payload);
    if (syncRes.success && syncRes.data) {
      const fallbackClusters = Array.isArray(syncRes.data.clusters) ? syncRes.data.clusters : [];
      const fallbackMajors = Array.isArray(syncRes.data.majors) ? syncRes.data.majors : [];

      if (fallbackClusters.length > 0 || fallbackMajors.length > 0) {
        await majorRepository.saveClustersAndMajors({
          clusters: fallbackClusters,
          majors: fallbackMajors,
        });
        const hierarchy = buildClusterHierarchyGraph({
          clusters: fallbackClusters,
          majors: fallbackMajors,
        });

        return {
          success: true,
          clusters: fallbackClusters,
          majors: fallbackMajors,
          data: fallbackMajors,
          mappedNodes: hierarchy.nodes,
          mappedEdges: hierarchy.edges,
          nodes: hierarchy.nodes,
          edges: hierarchy.edges,
          fromCache: false,
          error: null,
        };
      }
    }
  } catch (syncError) {
    console.warn('Sync cluster fallback kendala:', syncError?.message);
  }

  // ── FALLBACK 2: Membaca cache lokal dari IndexedDB (Offline-First) ──
  const cachedData = await majorRepository.getAllClustersAndMajors();
  if (
    Array.isArray(cachedData?.majors) &&
    cachedData.majors.length > 0
  ) {
    const hierarchy = buildClusterHierarchyGraph(cachedData);
    return {
      success: true,
      clusters: cachedData.clusters || [],
      majors: cachedData.majors,
      data: cachedData.majors,
      mappedNodes: hierarchy.nodes,
      mappedEdges: hierarchy.edges,
      nodes: hierarchy.nodes,
      edges: hierarchy.edges,
      fromCache: true,
      error: null,
    };
  }

  // Cek cache legacy jika belum ada data format cluster baru
  const legacyCached = await majorRepository.getAllMajors();
  if (Array.isArray(legacyCached) && legacyCached.length > 0) {
    const hierarchy = buildClusterHierarchyGraph(legacyCached);
    return {
      success: true,
      clusters: [],
      majors: legacyCached,
      data: legacyCached,
      mappedNodes: hierarchy.nodes,
      mappedEdges: hierarchy.edges,
      nodes: hierarchy.nodes,
      edges: hierarchy.edges,
      fromCache: true,
      error: null,
    };
  }

  return {
    success: false,
    clusters: [],
    majors: [],
    data: null,
    mappedNodes: [],
    mappedEdges: [],
    nodes: [],
    edges: [],
    fromCache: false,
    error: 'Gagal memuat rekomendasi rumpun keilmuan dan jurusan',
  };
}

/**
 * Melakukan fetch POST /api/v1/majors/recommend atau delegasi ke stream cluster.
 * Menyediakan backward-compatibility bagi komponen pemanggil legacy.
 */
export async function fetchRecommendedMajors(params) {
  return fetchRecommendedClustersStream(params);
}

/**
 * Mengambil data rekomendasi jurusan yang tersimpan di IndexedDB dan memetakannya ke graf hierarki.
 */
export async function getCachedMajors() {
  const cachedData = await majorRepository.getAllClustersAndMajors();
  if (
    Array.isArray(cachedData?.majors) &&
    cachedData.majors.length > 0
  ) {
    const hierarchy = buildClusterHierarchyGraph(cachedData);
    return {
      data: cachedData.majors,
      clusters: cachedData.clusters || [],
      majors: cachedData.majors,
      mappedNodes: hierarchy.nodes,
      mappedEdges: hierarchy.edges,
      nodes: hierarchy.nodes,
      edges: hierarchy.edges,
    };
  }

  const legacyCached = await majorRepository.getAllMajors();
  if (Array.isArray(legacyCached) && legacyCached.length > 0) {
    const hierarchy = buildClusterHierarchyGraph(legacyCached);
    return {
      data: legacyCached,
      clusters: [],
      majors: legacyCached,
      mappedNodes: hierarchy.nodes,
      mappedEdges: hierarchy.edges,
      nodes: hierarchy.nodes,
      edges: hierarchy.edges,
    };
  }

  // Jika IndexedDB kosong, kembalikan array kosong agar onboarding tidak terbypass secara salah
  return {
    data: [],
    clusters: [],
    majors: [],
    mappedNodes: [],
    mappedEdges: [],
    nodes: [],
    edges: [],
  };
}

export { buildClusterHierarchyGraph };

export const majorApi = {
  fetchRecommendedClustersStream,
  fetchRecommendedMajors,
  getCachedMajors,
  mapMajorNodesToUi,
  buildClusterHierarchyGraph,
  NODE_LAYOUT_SLOTS,
};

export default majorApi;
