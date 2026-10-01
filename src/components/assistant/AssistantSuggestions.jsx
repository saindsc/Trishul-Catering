export function AssistantSuggestions({ actions = [], onAction, opening = false }) {
  if (!actions.length) return null;
  return <div className={`assistant-suggestions ${opening ? 'assistant-suggestions--opening' : ''}`} aria-label={opening ? 'Suggested questions' : 'Suggested next actions'}>
    {actions.map((item, index) => <button type="button" key={`${item.type}-${item.label}-${index}`} onClick={() => onAction(item)}>{item.label}</button>)}
  </div>;
}