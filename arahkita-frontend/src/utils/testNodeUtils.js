/**
 * 3 Template Posisi Node Latihan:
 * 1. "vertical": Lurus ke bawah di tengah (X konstan)
 * 2. "zigzag-left": Dari kiri atas ke kanan bawah lalu selang-seling (kiri -> kanan -> kiri -> kanan...)
 * 3. "zigzag-right": Dari kanan atas ke kiri bawah lalu selang-seling (kanan -> kiri -> kanan -> kiri...)
 */
export const POSITION_TEMPLATES = {
  VERTICAL: "vertical",
  ZIGZAG_LEFT: "zigzag-left",
  ZIGZAG_RIGHT: "zigzag-right",
};

/**
 * Menghitung koordinat {x, y} berdasarkan index dan template posisi
 */
export const calculateNodePosition = (
  index,
  template = POSITION_TEMPLATES.ZIGZAG_LEFT,
  options = {},
) => {
  const {
    startY = 20,
    stepY = 100,
    leftX = 55,
    rightX = 245,
    centerX = 150,
  } = options;

  const y = startY + index * stepY;

  switch (template) {
    case POSITION_TEMPLATES.VERTICAL:
      // Template 1: Lurus vertikal ke bawah
      return { x: centerX, y };

    case POSITION_TEMPLATES.ZIGZAG_RIGHT:
      // Template 3: Kanan atas ke kiri bawah lalu selang-seling (Kanan -> Kiri -> Kanan...)
      return { x: index % 2 === 0 ? rightX : leftX, y };

    case POSITION_TEMPLATES.ZIGZAG_LEFT:
    default:
      // Template 2: Kiri atas ke kanan bawah lalu selang-seling (Kiri -> Kanan -> Kiri...)
      return { x: index % 2 === 0 ? leftX : rightX, y };
  }
};

/**
 * Generator data dummy untuk node soal jika belum ada data dari BE
 */
export const generateMockNodeData = (level, major = "Math") => {
  if (level === 1) {
    return {
      label: "1",
      level: 1,
      hasStar: true,
    };
  }

  const isMultiple = level % 2 === 0;
  if (isMultiple) {
    return {
      label: String(level),
      level,
      hasStar: true,
      questionData: {
        type: "multiple",
        title: `${major} Question`,
        question: "Manakah dari angka berikut yang merupakan bilangan prima?",
        subtext:
          "Silakan pilih semua opsi yang benar, Anda bisa mengubah jawaban ini nanti sebelum dikumpulkan.",
        options: [
          {
            id: 0,
            title: "Angka 2",
            description: "Satu-satunya bilangan prima yang bernilai genap.",
          },
          {
            id: 1,
            title: "Angka 3",
            description: "Bilangan prima ganjil pertama.",
          },
          {
            id: 2,
            title: "Angka 4",
            description: "Bukan bilangan prima (dapat dibagi 2).",
          },
          {
            id: 3,
            title: "Angka 5",
            description: "Bilangan prima ganjil.",
          },
        ],
      },
    };
  }

  return {
    label: String(level),
    level,
    hasStar: true,
    questionData: {
      type: "essay",
      title: `${major} Question`,
      question: "Manakah dari angka berikut yang merupakan bilangan prima?",
      subtext:
        "Silakan pilih semua opsi yang benar, Anda bisa mengubah jawaban ini nanti sebelum dikumpulkan.",
    },
  };
};

/**
 * Generator daftar nodes dinamis dengan format ReactFlow
 */
export const generateNodesList = ({
  nodesData = null,
  totalCount = 8,
  template = POSITION_TEMPLATES.ZIGZAG_LEFT,
  major = "Math",
}) => {
  const count =
    Array.isArray(nodesData) && nodesData.length > 0
      ? nodesData.length
      : Math.max(1, totalCount);

  return Array.from({ length: count }, (_, index) => {
    const level = index + 1;
    const customData =
      Array.isArray(nodesData) && nodesData[index] ? nodesData[index] : null;

    const data = customData
      ? {
          label: String(customData.label || level),
          level: customData.level || level,
          hasStar: customData.hasStar ?? true,
          questionData: customData.questionData,
          ...customData,
        }
      : generateMockNodeData(level, major);

    return {
      id: customData?.id || `test-${level}`,
      type: "platform",
      data,
      position: calculateNodePosition(index, template),
      style: {
        width: 100,
        height: 68,
        background: "transparent",
        border: "none",
        padding: 0,
      },
    };
  });
};

/**
 * Mentransformasikan array MinicaseNode dari backend ke format visual node XYFlow.
 * Selalu menempatkan Node 1 sebagai Syarat & Ketentuan (Rules) di urutan paling awal,
 * diikuti oleh minicase_number 2 hingga 11.
 *
 * @param {object} params
 * @param {Array<object>} params.minicases
 * @param {string} params.major
 * @param {string} params.template
 * @returns {Array<object>} Array node siap pakai untuk GraphNodeComponent
 */
export const mapMinicasesToTestNodes = ({
  minicases = [],
  major = "Math",
  template = POSITION_TEMPLATES.ZIGZAG_LEFT,
}) => {
  // Node 1: Selalu berupa Rules Pengerjaan (Terms & Policy) di frontend
  const ruleNode = {
    id: "rule-1",
    type: "platform",
    data: {
      id: "rule-1",
      label: "1",
      level: 1,
      hasStar: true,
      isRule: true,
      major,
    },
    position: calculateNodePosition(0, template),
    style: {
      width: 100,
      height: 68,
      background: "transparent",
      border: "none",
      padding: 0,
    },
  };

  if (!Array.isArray(minicases) || minicases.length === 0) {
    return [ruleNode];
  }

  // Urutkan minicases berdasarkan minicase_number
  const sorted = [...minicases].sort(
    (a, b) => (Number(a.minicase_number) || 0) - (Number(b.minicase_number) || 0)
  );

  const questionNodes = sorted.map((mc, idx) => {
    const level = mc.minicase_number || idx + 2;
    const index = level - 1; // index posisi (Level 2 -> index 1, Level 3 -> index 2, dst.)

    return {
      id: mc.id || `minicase-${level}`,
      type: "platform",
      data: {
        id: mc.id,
        label: String(level),
        level,
        hasStar: true,
        color: mc.circle_color,
        isCompleted: Boolean(mc.is_done),
        questionData: {
          id: mc.id,
          type: mc.node_type === "essay" ? "essay" : "multiple",
          node_type: mc.node_type,
          title: `${major} Question`,
          question: mc.question,
          options: mc.options,
          correct_answer: mc.correct_answer,
          evaluation_hint: mc.evaluation_hint,
          user_answer: mc.user_answer,
          is_done: Boolean(mc.is_done),
          subtext: mc.subject_name
            ? `Mata Kuliah: ${mc.subject_name}`
            : undefined,
          raw: mc,
        },
        raw: mc,
      },
      position: calculateNodePosition(index, template),
      style: {
        width: 100,
        height: 68,
        background: "transparent",
        border: "none",
        padding: 0,
      },
    };
  });

  return [ruleNode, ...questionNodes];
};
