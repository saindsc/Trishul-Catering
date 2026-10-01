import { useEffect, useState } from 'react';
import { Menu, Phone, X } from 'lucide-react';
import { businessConfig } from '../../data/config';
import { handleCallClick, handleEnquiryStart } from '../../utils/conversionHandlers';
import { Button, Link } from '../ui';

const nav = [['/', 'Home'], ['/menu', 'Menu'], ['/plan', 'Plan Your Catering']];
export function Brand() { return <Link href="/" className="brand" aria-label="Trishul Caterers home"><span className="brand-mark">त्रि</span><span>TRISHUL<small>CATERERS · HYDERABAD</small></span></Link>; }
export function Header() {
  const [open, setOpen] = useState(false); const [scrolled, setScrolled] = useState(false); const path = window.location.pathname;
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 30); onScroll(); window.addEventListener('scroll', onScroll, { passive: true }); return () => window.removeEventListener('scroll', onScroll); }, []);
  return <header className={`header ${scrolled ? 'header--scrolled' : ''} ${open ? 'header--open' : ''}`}><Brand/><nav>{nav.map(([href, label]) => <Link key={href} href={href} className={path === href ? 'active' : ''}>{label}</Link>)}</nav><div className="header-actions"><a href={`tel:${businessConfig.phoneNumbers[0]}`} className="phone-link" onClick={handleCallClick}><Phone size={15}/> Call us</a><Button href="/plan#planner-enquiry" className="desktop-only" onClick={handleEnquiryStart}>Enquire</Button><button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X/> : <Menu/>}</button></div><div className="mobile-menu" aria-hidden={!open}>{nav.map(([href, label], index) => <Link key={href} href={href} onClick={() => setOpen(false)} style={{ '--menu-delay': `${index * 70}ms` }}>{label}</Link>)}<Button href="/plan#planner-enquiry" onClick={event => { setOpen(false); handleEnquiryStart(event); }}>Enquire now</Button><p>Hyderabad · Since 2019</p></div></header>;
}
