import { Breakpoint } from '../core/types';

interface BreakpointSwitcherProps {
 currentBreakpoint: Breakpoint;
 onBreakpointChange: (breakpoint: Breakpoint) => void;
}

export default function BreakpointSwitcher({
 currentBreakpoint,
 onBreakpointChange,
}: BreakpointSwitcherProps) {
 const breakpoints: { key: Breakpoint; label: string; icon: string }[] = [
  { key: 'desktop', label: 'Desktop', icon: '🖥️' },
  { key: 'tablet', label: 'Tablet', icon: '📱' },
  { key: 'mobile', label: 'Mobile', icon: '📱' },
 ];

 return (
  <div
   style={{
    display: 'flex',
    gap: '8px',
    padding: '8px',
    background: 'white',
    borderBottom: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
   }}>
   {breakpoints.map((bp) => (
    <button
     key={bp.key}
     onClick={() => onBreakpointChange(bp.key)}
     style={{
      padding: '8px 16px',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: 500,
      transition: 'all 0.2s',
      border: 'none',
      cursor: 'pointer',
      ...(currentBreakpoint === bp.key
       ? { background: '#2563eb', color: 'white' }
       : { background: '#f3f4f6', color: '#374151' }),
     }}
     onMouseEnter={(e) => {
      if (currentBreakpoint !== bp.key) {
       e.currentTarget.style.background = '#e5e7eb';
      }
     }}
     onMouseLeave={(e) => {
      if (currentBreakpoint !== bp.key) {
       e.currentTarget.style.background = '#f3f4f6';
      }
     }}>
     <span style={{ marginRight: '8px' }}>{bp.icon}</span>
     {bp.label}
    </button>
   ))}
  </div>
 );
}
