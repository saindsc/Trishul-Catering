import { ArrowUpRight } from 'lucide-react';

export function Link({ href, children, className = '', onClick }) { return <a href={href} className={className} onClick={onClick}>{children}</a>; }
export function Eyebrow({ children, light = false }) { return <p className={`eyebrow ${light ? 'eyebrow--light' : ''}`}><i />{children}</p>; }
export function Button({ children, href = '#contact', variant = 'gold', className = '', onClick }) { return <Link href={href} className={`button button--${variant} ${className}`} onClick={onClick}>{children}<ArrowUpRight size={16} strokeWidth={1.8}/></Link>; }
