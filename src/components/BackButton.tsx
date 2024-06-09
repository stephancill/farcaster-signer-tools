export function BackButton({ onBack }: { onBack: () => void }) {
  return <button onClick={() => onBack()}>← Back</button>;
}
