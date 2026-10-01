import { Phone, MessageCircle, Sparkles } from 'lucide-react';
import { businessConfig } from '../../data/config';
import { handleCallClick, handlePlannerStart, handleWhatsAppClick } from '../../utils/conversionHandlers';
import { Brand } from './Header';
import { Button, Eyebrow } from '../ui';

export function ContactActions() {
	const isPlanner = window.location.pathname === '/plan';
	return <>{!isPlanner && <a className="whatsapp" href={businessConfig.whatsappUrl} target="_blank" rel="noreferrer" aria-label="Message us on WhatsApp" onClick={handleWhatsAppClick}><MessageCircle size={20}/><b>WhatsApp us</b></a>}{!isPlanner && <div className="mobile-contact"><a href={businessConfig.whatsappUrl} onClick={handleWhatsAppClick}><MessageCircle size={17}/>WhatsApp</a><a href={`tel:${businessConfig.phoneNumbers[0]}`} onClick={handleCallClick}><Phone size={17}/>Call</a><a href="/plan" onClick={handlePlannerStart}><Sparkles size={17}/>Plan</a></div>}</>;
}

export function Footer() { return <footer id="contact"><div className="footer-top"><Eyebrow light>Begin with a conversation</Eyebrow><h2>Let’s make your occasion<br/><em>memorable.</em></h2><p>Tell us what you’re celebrating. We’ll take it from there.</p><div className="footer-actions"><Button href={businessConfig.whatsappUrl} variant="ivory" onClick={handleWhatsAppClick}>Get Exact Quote on WhatsApp</Button><a href={`tel:${businessConfig.phoneNumbers[0]}`} className="footer-call" onClick={handleCallClick}><Phone size={15}/> Call Trishul Caterers</a></div></div><div className="footer-bottom"><Brand/><p>Pure Veg & Non-Veg catering<br/>for celebrations across Hyderabad.</p><p>{businessConfig.location}<br/><span className="footer-other-phones">Also call: {businessConfig.phoneNumbers.slice(1).map((number, index) => <span key={number}><a href={`tel:${number}`} onClick={handleCallClick}>{number}</a>{index < businessConfig.phoneNumbers.length - 2 ? ' · ' : ''}</span>)}</span><br/>© {new Date().getFullYear()} Trishul Caterers</p></div></footer>; }
