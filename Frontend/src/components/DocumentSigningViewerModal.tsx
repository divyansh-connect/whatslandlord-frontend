import React, { useRef, useState, useEffect } from 'react';
import { FormDialog } from './FormDialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { ShieldCheck, FileText, CheckCircle2, Eraser, PenTool, Type, Check } from 'lucide-react';
import { clsx } from 'clsx';

interface DocumentSigningViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestItem: any;
  onCompleteSign: (id: string, signatureDataUrl: string) => void;
}

export const DocumentSigningViewerModal: React.FC<DocumentSigningViewerModalProps> = ({
  open,
  onOpenChange,
  requestItem,
  onCompleteSign,
}) => {
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(requestItem?.signatureDataUrl || null);
  const [signMode, setSignMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState(Array.isArray(requestItem?.signers) ? requestItem.signers[0] : (requestItem?.signers || 'Sarah Davis'));
  const [penColor, setPenColor] = useState<'#1e40af' | '#0f172a'>('#1e40af');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    if (open && !signatureDataUrl && signMode === 'draw') {
      setTimeout(initCanvas, 50);
    }
  }, [open, signatureDataUrl, signMode]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = penColor;
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.strokeStyle = penColor;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const generateTypedSignature = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = penColor;
    ctx.font = 'italic bold 44px "Brush Script MT", "Dancing Script", cursive, Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName || 'Signer', canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL('image/png');
  };

  const handleApplySignature = () => {
    if (signMode === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        setSignatureDataUrl(canvas.toDataURL('image/png'));
      }
    } else {
      setSignatureDataUrl(generateTypedSignature());
    }
  };

  const handleFinalSubmit = () => {
    let finalDataUrl = signatureDataUrl;
    if (!finalDataUrl) {
      if (signMode === 'draw' && canvasRef.current) {
        finalDataUrl = canvasRef.current.toDataURL('image/png');
      } else if (signMode === 'type') {
        finalDataUrl = generateTypedSignature();
      }
    }
    if (!finalDataUrl) return;

    setIsSubmitting(true);
    setTimeout(() => {
      onCompleteSign(requestItem.id, finalDataUrl!);
      setIsSubmitting(false);
      onOpenChange(false);
    }, 300);
  };

  if (!requestItem) return null;

  const isAlreadySigned = requestItem.status === 'Signed' || !!signatureDataUrl;

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={`Sign Document — ${requestItem.documentName || 'Lease_Agreement.pdf'}`}>
      <div className="space-y-5 pt-1 text-foreground font-sans">
        {/* Status Header Banner */}
        <div className={clsx(
          'p-3.5 rounded-2xl border flex items-center justify-between font-semibold text-xs',
          isAlreadySigned ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : 'bg-primary/10 border-primary/30 text-primary'
        )}>
          <div className="flex items-center gap-3">
            {isAlreadySigned ? <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" /> : <PenTool className="w-5 h-5 text-primary shrink-0" />}
            <div>
              <p className="font-extrabold text-sm">{isAlreadySigned ? 'Document Digitally Signed & Verified' : 'Sign Below to Complete Agreement'}</p>
              <p className="text-[10px] opacity-80">{isAlreadySigned ? `Signed on ${requestItem.signedAt || 'Today'} • Audit Hash Verified` : 'Draw or type your signature directly below.'}</p>
            </div>
          </div>
          {isAlreadySigned && (
            <span className="bg-emerald-500 text-white font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-wider">
              SIGNED
            </span>
          )}
        </div>

        {/* SIMULATED PDF PAPER SHEET */}
        <div className="relative border border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 p-6 shadow-lg space-y-4 max-h-[420px] overflow-y-auto font-serif text-slate-800 dark:text-slate-200">
          {/* Header */}
          <div className="border-b pb-3 flex justify-between items-start font-sans">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-black">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-slate-100">RESIDENTIAL LEASE AGREEMENT</h2>
                <p className="text-[10px] text-slate-500 font-medium">Ref ID: {requestItem.id || 'DOC-LEGAL'} • {requestItem.companyName || 'Property Management'}</p>
              </div>
            </div>
          </div>

          {/* Document Content */}
          <div className="space-y-3 text-xs leading-relaxed font-sans text-slate-700 dark:text-slate-300">
            <p>
              This Agreement is made on <strong>{requestItem.date || new Date().toLocaleDateString()}</strong> by and between <strong>{requestItem.companyName || 'Management Office'}</strong> (Landlord) and <strong>{Array.isArray(requestItem.signers) ? requestItem.signers.join(', ') : (requestItem.signers || 'Tenant')}</strong>.
            </p>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-[11px] font-sans">
              <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Property</span><strong className="text-slate-900 dark:text-slate-100">{requestItem.property || requestItem.propertyName || 'Designated Premises'}</strong></div>
              <div><span className="text-[9px] uppercase font-bold text-slate-400 block">Status</span><strong className="text-slate-900 dark:text-slate-100">{requestItem.status || 'Active'}</strong></div>
            </div>
          </div>

          {/* DIRECT EMBEDDED SIGNATURE AREA (NO POPUP MODAL NEEDED!) */}
          <div className="pt-4 border-t font-sans space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold uppercase text-slate-400">Signature Field</span>
              {!isAlreadySigned && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSignMode('draw')}
                    className={clsx('px-3 py-1 rounded-lg text-[10px] font-bold transition', signMode === 'draw' ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600')}
                  >
                    ✏️ Draw Ink Signature
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignMode('type')}
                    className={clsx('px-3 py-1 rounded-lg text-[10px] font-bold transition', signMode === 'type' ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600')}
                  >
                    ⌨️ Type Signature Name
                  </button>
                </div>
              )}
            </div>

            {/* Render Signed Stamp OR Direct Canvas */}
            {signatureDataUrl ? (
              <div className="p-4 border rounded-xl bg-slate-50 dark:bg-slate-900 text-center space-y-1">
                <img src={signatureDataUrl} alt="Signature Stamp" className="max-h-16 mx-auto object-contain" />
                <p className="text-[9px] text-emerald-600 font-bold">✓ Digitally Stamped & Verified</p>
              </div>
            ) : signMode === 'draw' ? (
              /* DIRECT DRAW CANVAS */
              <div className="space-y-2">
                <div className="relative border-2 border-dashed border-primary/40 rounded-xl bg-slate-50 dark:bg-slate-900 p-1">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-32 cursor-crosshair rounded-lg touch-none bg-white dark:bg-slate-950"
                  />
                  {!hasDrawn && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-bold opacity-60">
                      Sign here using mouse or finger...
                    </div>
                  )}
                </div>
                <div className="flex justify-between">
                  <Button variant="ghost" size="sm" onClick={clearCanvas} className="text-[10px] text-rose-500 font-bold h-7">
                    <Eraser className="w-3 h-3 mr-1" /> Clear
                  </Button>
                  <span className="text-[9px] text-slate-400 font-medium">Draw signature inside box</span>
                </div>
              </div>
            ) : (
              /* DIRECT TYPE SIGNATURE NAME */
              <div className="space-y-3 p-4 border rounded-xl bg-slate-50 dark:bg-slate-900">
                <Input
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="Type full legal name"
                  className="font-bold text-xs"
                />
                <div className="p-3 border rounded-lg bg-white dark:bg-slate-950 text-center">
                  <span className="text-3xl text-blue-800 dark:text-blue-400 italic font-serif" style={{ fontFamily: '"Brush Script MT", "Dancing Script", cursive, Georgia, serif' }}>
                    {typedName || 'Your Signature'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex justify-between items-center pt-3 border-t font-sans">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          {!isAlreadySigned && (
            <Button
              onClick={handleFinalSubmit}
              disabled={signMode === 'draw' && !hasDrawn && !signatureDataUrl}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Complete & Submit Signature
            </Button>
          )}
        </div>
      </div>
    </FormDialog>
  );
};
