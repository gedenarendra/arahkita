import { useState } from "react";
import GradesComponent from "./GradesComponent";
import InterestComponent from "./InterestComponent";

function GradesStep({
  view, // "grades" | "interest" (jika dikontrol oleh parent)
  // Props untuk Grades
  subStep = 1,
  onSubStepChange,
  selectedSubjects = [],
  setSelectedSubjects,
  errorMessage = "",
  // Props untuk Interest
  interestSubStep = 1,
  onInterestSubStepChange,
  selectedInterests = [],
  setSelectedInterests,
  interestErrorMessage = "",
  maxInterests = 5,
  onBackendPayloadChange,
}) {
  // Local fallback jika view tidak dikontrol parent
  const [localView] = useState("grades");
  const activeView = view !== undefined ? view : localView;

  return (
    <div className="w-full h-full flex flex-col justify-between min-h-0">
      {activeView === "grades" ? (
        <GradesComponent
          subStep={subStep}
          onSubStepChange={onSubStepChange}
          selectedSubjects={selectedSubjects}
          setSelectedSubjects={setSelectedSubjects}
          errorMessage={errorMessage}
        />
      ) : (
        <InterestComponent
          subStep={interestSubStep}
          onSubStepChange={onInterestSubStepChange}
          selectedInterests={selectedInterests}
          setSelectedInterests={setSelectedInterests}
          errorMessage={interestErrorMessage}
          maxInterests={maxInterests}
          onBackendPayloadChange={onBackendPayloadChange}
        />
      )}
    </div>
  );
}

export { GradesComponent, InterestComponent };
export default GradesStep;
