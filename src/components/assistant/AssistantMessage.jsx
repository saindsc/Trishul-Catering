export function AssistantMessage({ message, onAddItems, selectedIds = [] }) {
  const isAssistant = message.role === 'assistant';
  return <article className={`assistant-message ${isAssistant ? 'assistant-message--assistant' : 'assistant-message--user'}`}>
    {isAssistant && <span className="assistant-message-mark" aria-hidden="true">T</span>}
    <div className="assistant-message-body">
      <p>{message.text}</p>
      {message.data?.items?.length > 0 && <ul className="assistant-result-list" aria-label="Matching menu items">{message.data.items.map(item => <li key={item.id}>
        <span className={`assistant-food-mark assistant-food-mark--${item.type}`} aria-label={item.type === 'veg' ? 'Vegetarian' : 'Non-vegetarian'}>{item.type === 'veg' ? '●' : '◆'}</span>
        <span><b>{item.name}</b><small>{item.sectionName || item.category}</small></span>
        {onAddItems && <button type="button" disabled={selectedIds.includes(item.id)} onClick={() => onAddItems([item.id])} aria-label={selectedIds.includes(item.id) ? `${item.name} is already in my plan` : `Add ${item.name} to my plan`}>{selectedIds.includes(item.id) ? 'Added' : 'Add'}</button>}
      </li>)}</ul>}
    </div>
  </article>;
}