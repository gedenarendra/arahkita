import TermsPolicyComponent from "../components/test/TermsPolicyComponent";
import QuestionComponent from "../components/test/QuestionComponent";

function TestPages({
  mode = "terms", // 'terms' (Node 1) | 'question' (Node > 1)
  major = "Math",
  level = 2,
  questionData,
  currentQuestion,
  totalQuestions,
  progress,
  isReadOnly = false,
  isSubmitting = false,
  errorMessage = "",
  onBack,
  onAgreeTerms,
  onSubmitQuestion,
}) {
  if (mode === "terms") {
    return (
      <TermsPolicyComponent
        onBack={onBack}
        onAgree={onAgreeTerms}
        onDisagree={onBack}
      />
    );
  }

  return (
    <QuestionComponent
      major={major}
      level={level}
      questionData={questionData}
      currentQuestion={currentQuestion}
      totalQuestions={totalQuestions}
      progress={progress}
      isReadOnly={isReadOnly}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      onBack={onBack}
      onSubmit={onSubmitQuestion}
    />
  );
}

export default TestPages;
