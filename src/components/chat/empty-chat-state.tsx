interface EmptyChatStateProps {
  modelName: string;
}

export function EmptyChatState({ modelName }: EmptyChatStateProps) {
  return (
    <div className="flex justify-center items-center  bg-amber-500 w-full">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-xl font-semibold text-foreground-default">
          Start the conversation
        </h2>
        <p className="text-foreground-muted">
          Send a message to begin chatting with {modelName}.
        </p>
      </div>
    </div>
  );
}
