import { Check, Plus } from 'lucide-react';

export function MenuItem({ item, selected, onToggle, index }) {
  const isVeg = item.type === 'veg';
  return <li className={`menu-row ${selected ? 'is-selected' : ''}`}>
    <span className="menu-row-number">{String(index + 1).padStart(2, '0')}</span>
    <span className={`food-indicator food-indicator--${item.type}`} style={{ color: isVeg ? '#26934a' : '#ae4b33' }} aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}>{isVeg ? '●' : '◆'}</span>
    <span className="menu-row-name">{item.name}</span>
    <button onClick={() => onToggle(item)} aria-label={`${selected ? 'Remove' : 'Add'} ${item.name} ${selected ? 'from' : 'to'} plan`}>
      {selected ? <Check size={15}/> : <Plus size={16}/>}<i>{selected ? 'Added' : 'Add to Plan'}</i>
    </button>
  </li>;
}
