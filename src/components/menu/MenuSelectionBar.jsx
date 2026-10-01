import { ArrowRight, Check, X } from 'lucide-react';
import { handlePlannerStart } from '../../utils/conversionHandlers';
export function MenuSelectionBar({ count, onClear }) { if (!count) return null; return <div className="menu-selection-bar"><span><i><Check size={14}/></i><b>{count}</b> {count === 1 ? 'dish' : 'dishes'} selected</span><div><button onClick={onClear}><X size={15}/> Clear</button><a href="/plan" onClick={handlePlannerStart}>Build My Plan <ArrowRight size={16}/></a></div></div>; }
