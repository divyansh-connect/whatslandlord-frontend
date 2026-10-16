import React, { useEffect, useState, useRef } from 'react';
import { ShieldCheck, Lock, X, Loader2, CheckCircle2, AlertCircle, CreditCard, ExternalLink } from 'lucide-react';
import { Button } from './ui/Button';



interface AcceptHostedModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  hostedUrl?: string;
  planName: string;
  amount: number;
  onSuccess: (txData: { transactionId: string; authCode?: string }) => void;
  onCancel: () => void;
  onFailure: (errorMsg: string) => void;
}

export const AcceptHostedModal: React.FC<AcceptHostedModalProps> = ({
  isOpen,
  onClose,
  token,
  hostedUrl = 'https://test.authorize.net/payment/payment',
  planName,
  amount,
  onSuccess,
  onCancel,
  onFailure,
}) => {
  const [paymentState, setPaymentState] = useState<'hosted' | 'processing' | 'success' | 'failed'>('hosted');
  const [errorMessage, setErrorMessage] = useState('');
  const [simCardNumber, setSimCardNumber] = useState('4007000000027');
  const [simExpiry, setSimExpiry] = useState('12/28');
  const [simCvv, setSimCvv] = useState('123');
  const formRef = useRef<HTMLFormElement>(null);

  const isSimulatedToken = token.startsWith('HOSTED-TOKEN-SIM-') || !token;

  useEffect(() => {
    if (isOpen && formRef.current && !isSimulatedToken) {
      formRef.current.submit();
    }
  }, [isOpen, token, isSimulatedToken]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data === 'string') {
        try {
          // Authorize.Net postMessage parsing
          if (event.data.includes('action=successfulSave') || event.data.includes('action=transactResponse')) {
            setPaymentState('success');
            let transactionId = '';
            let authCode = 'AUTH-OK';

            if (event.data.includes('response=')) {
              const urlParams = new URLSearchParams(event.data);
              const responseJsonStr = urlParams.get('response');
              if (responseJsonStr) {
                try {
                  const responseObj = JSON.parse(responseJsonStr);
                  transactionId = responseObj.transId || '';
                  if (responseObj.authorizationCode) {
                    authCode = responseObj.authorizationCode;
                  }
                } catch (jsonErr) {
                  console.error('Failed to parse Authorize.Net postMessage response JSON:', jsonErr);
                }
              }
            }

            if (!transactionId) {
              transactionId = `AUTHNET-HOSTED-${Math.floor(100000000 + Math.random() * 900000000)}`;
            }

            setTimeout(() => {
              onSuccess({ transactionId, authCode });
            }, 1200);
          } else if (event.data.includes('action=cancel')) {
            onCancel();
          }
        } catch (e) {
          // Ignore unrelated postMessages
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess, onCancel]);

  if (!isOpen) return null;

  const handleSimulatedPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentState('processing');
    setTimeout(() => {
      if (simCardNumber.replace(/\s+/g, '').startsWith('4007') || simCardNumber.replace(/\s+/g, '').startsWith('4111')) {
        setPaymentState('success');
        const mockTxId = `AUTHNET-SANDBOX-${Math.floor(100000000 + Math.random() * 900000000)}`;
        setTimeout(() => {
          onSuccess({ transactionId: mockTxId, authCode: 'SANDBOX-APPROVED' });
        }, 1200);
      } else {
        setPaymentState('failed');
        setErrorMessage('Transaction Declined by Authorize.Net Sandbox: Invalid Test Card Number');
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm tracking-wide">Authorize.Net Accept Hosted</h3>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase rounded-md border border-amber-500/30">
                  Sandbox
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Official Hosted Payment Gateway Interface</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              try { if (onCancel) onCancel(); } catch (e) {}
              try { if (onClose) onClose(); } catch (e) {}
            }}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Summary Bar */}
        <div className="bg-slate-100 dark:bg-slate-950/80 px-6 py-3 border-b border-slate-200 dark:border-white/5 flex justify-between items-center text-xs font-bold">
          <div>
            <span className="text-slate-500 uppercase text-[10px] tracking-wider block">Plan Subscription</span>
            <span className="text-slate-900 dark:text-white text-sm font-extrabold">{planName}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 uppercase text-[10px] tracking-wider block">Total Amount</span>
            <span className="text-emerald-600 dark:text-emerald-400 text-lg font-black">${amount}/mo</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {paymentState === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
              <div>
                <h4 className="font-black text-base text-slate-900 dark:text-white">Authorizing Sandbox Payment...</h4>
                <p className="text-xs text-slate-500 mt-1">Connecting to Authorize.Net Secure Gateway</p>
              </div>
            </div>
          )}

          {paymentState === 'success' && (
            <div className="py-10 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-black text-lg text-slate-900 dark:text-white">Payment Approved!</h4>
                <p className="text-xs text-slate-500 mt-1">Activating your Manager SaaS Workspace...</p>
              </div>
            </div>
          )}

          {paymentState === 'failed' && (
            <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-base text-slate-900 dark:text-white">Payment Failed</h4>
                <p className="text-xs text-rose-500 font-medium max-w-xs leading-relaxed">{errorMessage}</p>
              </div>
              <Button onClick={() => setPaymentState('hosted')} className="mt-2 text-xs bg-slate-800 text-white font-bold h-9">
                Try Again
              </Button>
            </div>
          )}

          {paymentState === 'hosted' && (
            <div>
              {!isSimulatedToken ? (
                <div className="space-y-4">
                  <form
                    ref={formRef}
                    action={hostedUrl}
                    method="POST"
                    target="add_payment_iframe"
                    className="hidden"
                  >
                    <input type="hidden" name="token" value={token} />
                  </form>
                  <iframe
                    name="add_payment_iframe"
                    title="AuthorizeNetHostedForm"
                    className="w-full h-[380px] rounded-2xl border border-slate-200 dark:border-white/10"
                    frameBorder="0"
                    scrolling="no"
                  />
                </div>
              ) : (
                <form onSubmit={handleSimulatedPaymentSubmit} className="space-y-4">
                  <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center space-x-3 text-xs text-blue-600 dark:text-blue-400">
                    <Lock className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="font-extrabold">Authorize.Net Hosted Payment Form (Sandbox)</p>
                      <p className="text-[10px] opacity-90">Enter Sandbox test card credentials to simulate hosted payment checkout.</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Official Test Card Number</label>
                    <div className="relative">
                      <input
                        required
                        type="text"
                        value={simCardNumber}
                        onChange={(e) => setSimCardNumber(e.target.value)}
                        placeholder="4007000000027"
                        className="w-full text-xs font-mono font-bold p-3 rounded-xl border bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white pl-10"
                      />
                      <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    </div>
                    <p className="text-[9px] text-slate-400">Sandbox Visa: 4007000000027 or 4111111111111111</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Expiration Date</label>
                      <input
                        required
                        type="text"
                        value={simExpiry}
                        onChange={(e) => setSimExpiry(e.target.value)}
                        placeholder="12/28"
                        className="w-full text-xs font-semibold p-3 rounded-xl border bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500">Card CVV Code</label>
                      <input
                        required
                        type="password"
                        maxLength={4}
                        value={simCvv}
                        onChange={(e) => setSimCvv(e.target.value)}
                        placeholder="123"
                        className="w-full text-xs font-semibold p-3 rounded-xl border bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white text-center"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        try { if (onCancel) onCancel(); } catch (e) {}
                        try { if (onClose) onClose(); } catch (e) {}
                      }}
                      className="text-xs h-10 px-4 font-bold rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs h-10 px-6 rounded-xl shadow-lg shadow-blue-500/25 flex items-center space-x-2"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Submit Authorize.Net Payment</span>
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 dark:bg-slate-950/50 p-3 border-t border-slate-200 dark:border-white/5 text-center text-[10px] text-slate-400 font-semibold flex items-center justify-center space-x-2">
          <Lock className="w-3 h-3 text-emerald-500" />
          <span>256-Bit SSL Encrypted • Authorize.Net Sandbox Gateway Host</span>
        </div>
      </div>
    </div>
  );
};
