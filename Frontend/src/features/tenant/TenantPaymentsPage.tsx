import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FormDialog } from '../../components/FormDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { CreditCard, Landmark, CheckCircle, Loader2, Shield, Check, Printer } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { useCompanyStore } from '../../store/useStore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const TenantPaymentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { companyName: globalCompanyName, companyAddress: globalCompanyAddress } = useCompanyStore();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'details' | 'processing' | 'receipt'>('details');
  const [processingMsg, setProcessingMsg] = useState('Initializing SSL handshaking...');

  // Queries
  const { data: metrics } = useQuery({
    queryKey: ['tenant-dashboard-metrics'],
    queryFn: () => api.tenantPortal.getMetrics(),
  });
  const { data: allPayments = [], isLoading } = useQuery({ queryKey: ['tenant-payments-list'], queryFn: () => api.rent.getAll() });

  const { data: profile } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: () => api.tenantProfile.get(),
  });

  const { data: allInvoices = [] } = useQuery({
    queryKey: ['invoices-list'],
    queryFn: () => api.invoices.getAll(),
  });

  const tenantName = profile ? `${profile.firstName} ${profile.lastName}` : 'Sarah Connor';

  const tenantInvoices = React.useMemo(() => {
    return allInvoices;
  }, [allInvoices]);

  const tenantPayments = React.useMemo(() => {
    return allPayments;
  }, [allPayments]);

  const transactions = React.useMemo(() => {
    const list: any[] = [];
    
    // Map real invoices
    tenantInvoices.forEach((inv: any) => {
      const isPaid = inv.status === 'Paid' || inv.status === 'PAID' || inv.balance === 0;
      list.push({
        date: inv.dueDate,
        type: 'Invoice',
        desc: `Monthly Rent Assessment`,
        ref: `INV-${inv.id.substring(0, 8).toUpperCase()}`,
        invoiceAmt: inv.amount,
        paymentAmt: 0,
        additionalChg: 0,
        status: isPaid ? 'Paid' : (inv.status === 'PENDING' ? 'Pending' : 'Unpaid')
      });

      // If invoice is Paid but has no separate payment record, add matching payment entry so running balance stays accurate
      if (isPaid) {
        const hasPayment = tenantPayments.some((pay: any) => pay.invoiceId === inv.id || (pay.amount === inv.amount && pay.dueDate === inv.dueDate));
        if (!hasPayment) {
          list.push({
            date: inv.paidDate ? inv.paidDate.split('T')[0] : inv.dueDate,
            type: 'Payment',
            desc: `Rent Payment (Settled)`,
            ref: `PAY-${inv.id.substring(0, 6).toUpperCase()}`,
            invoiceAmt: 0,
            paymentAmt: inv.amount,
            additionalChg: 0,
            status: 'Cleared'
          });
        }
      }
    });

    // Map real payments
    tenantPayments.forEach((pay: any) => {
      list.push({
        date: pay.paidDate ? pay.paidDate.split('T')[0] : pay.dueDate ? pay.dueDate.split('T')[0] : '',
        type: 'Payment',
        desc: `Rent Payment - ${pay.paymentMethod || 'Online'}`,
        ref: `PAY-${pay.id.substring(0, 8).toUpperCase()}`,
        invoiceAmt: 0,
        paymentAmt: pay.amount,
        additionalChg: 0,
        status: pay.status === 'Cleared' || pay.status === 'PAID' || pay.status === 'Paid' ? 'Cleared' : 'Pending'
      });
    });

    return list;
  }, [tenantInvoices, tenantPayments]);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [searchRef, setSearchRef] = useState('');

  const calculatedLedger = React.useMemo(() => {
    let runningBalance = 0;
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    
    return sorted.map((tx) => {
      if (tx.type === 'Invoice') {
        runningBalance += tx.invoiceAmt;
      } else if (tx.type === 'Charge') {
        runningBalance += tx.additionalChg;
      } else {
        runningBalance -= tx.paymentAmt;
      }
      return {
        ...tx,
        balance: runningBalance
      };
    });
  }, [transactions]);

  const filteredLedger = React.useMemo(() => {
    return calculatedLedger.filter((entry) => {
      const matchStart = startDate ? entry.date >= startDate : true;
      const matchEnd = endDate ? entry.date <= endDate : true;
      const matchType = selectedType === 'All' ? true : entry.type === selectedType;
      const matchRef = searchRef ? entry.ref.toLowerCase().includes(searchRef.toLowerCase()) : true;
      return matchStart && matchEnd && matchType && matchRef;
    });
  }, [calculatedLedger, startDate, endDate, selectedType, searchRef]);

  const ledgerMetrics = React.useMemo(() => {
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalCharges = 0;
    
    calculatedLedger.forEach((tx) => {
      if (tx.type === 'Invoice') {
        totalInvoiced += tx.invoiceAmt;
      } else if (tx.type === 'Charge') {
        totalCharges += tx.additionalChg;
      } else if (tx.type === 'Payment') {
        totalPaid += tx.paymentAmt;
      } else if (tx.type === 'Credit' || tx.type === 'Adjustment') {
        // Credits/Adjustments reduce outstanding balance but are listed as payments/adjustments
        totalPaid += tx.paymentAmt;
      }
    });

    const currentBal = calculatedLedger[calculatedLedger.length - 1]?.balance ?? 0;

    return {
      totalInvoiced,
      totalPaid,
      totalCharges,
      currentBal
    };
  }, [calculatedLedger]);

  const outstandingBalance = ledgerMetrics.currentBal;

  const handleExportCSV = () => {
    const headers = ['Date', 'Transaction Type', 'Description', 'Reference Number', 'Invoice Amount', 'Payment Amount', 'Additional Charge', 'Running Balance', 'Status'];
    const rows = filteredLedger.map(tx => [
      tx.date,
      tx.type,
      tx.desc,
      tx.ref,
      tx.invoiceAmt.toFixed(2),
      tx.paymentAmt.toFixed(2),
      tx.additionalChg.toFixed(2),
      tx.balance.toFixed(2),
      tx.status
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tenant_ledger_${tenantName.replace(/\s+/g, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Title & Header
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text('TENANT PAYMENT LEDGER STATEMENT', 14, 18);

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Tenant: ${tenantName} | Outstanding Balance: $${outstandingBalance.toLocaleString()}`, 14, 25);
      doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records: ${filteredLedger.length}`, 14, 30);

      const headers = ['Date', 'Type', 'Description', 'Ref No.', 'Inv. Amount', 'Payment', 'Balance', 'Status'];
      const tableRows = filteredLedger.map((tx: any) => [
        String(tx.date || 'N/A'),
        String(tx.type || 'Charge'),
        String(tx.desc || 'Rent'),
        String(tx.ref || '—'),
        `$${Number(tx.invoiceAmt || 0).toFixed(2)}`,
        `$${Number(tx.paymentAmt || 0).toFixed(2)}`,
        `$${Number(tx.balance || 0).toFixed(2)}`,
        String(tx.status || 'Posted'),
      ]);

      autoTable(doc, {
        startY: 35,
        head: [headers],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 3 },
      });

      doc.save(`tenant_ledger_${tenantName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
    } catch (err) {
      console.warn('jsPDF export error, falling back to window.print:', err);
      window.print();
    }
  };

  // Form states
  const [paymentOption, setPaymentOption] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState('1850');
  const [method, setMethod] = useState<'ACH' | 'Credit Card' | 'Debit Card'>('ACH');
  const [receiptNumber, setReceiptNumber] = useState('');

  // ACH Fields
  const [achHolderName, setAchHolderName] = useState('');
  const [achBankName, setAchBankName] = useState('');
  const [achRoutingNumber, setAchRoutingNumber] = useState('');
  const [achAccountNumber, setAchAccountNumber] = useState('');
  const [achAccountType, setAchAccountType] = useState('Checking');

  // Card Fields
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardZip, setCardZip] = useState('');

  // Sync amount with option
  React.useEffect(() => {
    if (paymentOption === 'full') {
      setAmount(outstandingBalance.toString());
    }
  }, [outstandingBalance, paymentOption]);

  const amountNum = Number(amount) || 0;
  const fee = method === 'ACH' 
    ? 0 
    : method === 'Credit Card' 
      ? Number((amountNum * 0.029).toFixed(2)) 
      : 4.99;
  const total = amountNum + fee;

  // Active Gateway query for company-isolated payments
  const { data: activeGateway } = useQuery({
    queryKey: ['active-tenant-gateway'],
    queryFn: () => api.tenantPayments.getActiveGateway(),
  });

  // Inject Razorpay JS SDK dynamically if Manager configured Razorpay
  React.useEffect(() => {
    if (activeGateway?.provider === 'RAZORPAY') {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [activeGateway]);

  const payMutation = useMutation({
    mutationFn: async () => {
      if (activeGateway?.provider === 'RAZORPAY' && (window as any).Razorpay) {
        setStep('processing');
        setProcessingMsg('Creating Razorpay secure order...');
        const orderData = await api.tenantPayments.createRazorpayOrder({ amount: total, currency: 'USD' });
        
        return new Promise((resolve, reject) => {
          const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency || 'USD',
            name: profile?.companyName || 'Rental Payment',
            description: 'Rent Payment Transaction',
            order_id: orderData.orderId,
            handler: async (response: any) => {
              try {
                setProcessingMsg('Verifying payment signature with gateway...');
                const verifyRes = await api.tenantPayments.verifyRazorpayPayment({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  amount: total,
                });
                resolve(verifyRes);
              } catch (err) {
                reject(err);
              }
            },
            prefill: {
              name: tenantName,
              email: profile?.email || '',
              contact: profile?.phone || '',
            },
            theme: {
              color: '#2563eb',
            },
          };
          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', function (res: any) {
            reject(new Error(res.error?.description || 'Razorpay payment cancelled'));
          });
          rzp.open();
        });
      }

      return api.tenantPayments.payRent({
        amount: total,
        baseAmount: amountNum,
        method,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-payments-list'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-list'] });
      setReceiptNumber(`RCP-${Math.floor(100000 + Math.random() * 900000)}-ZTR`);
      setStep('receipt');
    },
    onError: (err: any) => {
      setStep('details');
      alert(err?.message || 'Transaction authorization failed. Please try again.');
    }
  });

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - ${receiptNumber}</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1f2937;
              padding: 40px;
              max-width: 480px;
              margin: 0 auto;
              background-color: #ffffff;
            }
            .receipt-card {
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              padding: 30px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03);
            }
            .header {
              text-align: center;
              margin-bottom: 25px;
            }
            .logo {
              font-size: 24px;
              font-weight: 900;
              letter-spacing: -0.05em;
              color: #2563eb;
              margin: 0;
            }
            .logo span {
              color: #10b981;
            }
            .header h1 {
              font-size: 16px;
              font-weight: 800;
              margin: 10px 0 0 0;
              color: #111827;
            }
            .header p {
              font-size: 11px;
              color: #6b7280;
              margin: 3px 0 0 0;
            }
            .success-stamp {
              background-color: #d1fae5;
              color: #065f46;
              border: 1px solid #a7f3d0;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              padding: 4px 14px;
              border-radius: 9999px;
              display: inline-block;
              margin-top: 12px;
              letter-spacing: 0.05em;
            }
            .details-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .details-table td {
              padding: 12px 0;
              border-bottom: 1px dashed #e5e7eb;
              font-size: 11px;
            }
            .details-table tr:last-child td {
              border-bottom: none;
            }
            .label {
              color: #6b7280;
              font-weight: 600;
            }
            .val {
              text-align: right;
              font-weight: 700;
              color: #111827;
            }
            .total-val {
              color: #10b981;
              font-size: 13px;
              font-weight: 900;
            }
            .footer {
              text-align: center;
              font-size: 9px;
              color: #9ca3af;
              margin-top: 25px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt-card">
            <div class="header">
              <h3 class="logo">${profile?.companyName || 'Property Management'}</h3>
              <h1>Payment Receipt</h1>
              <p>Reference ID: ${receiptNumber}</p>
              <span class="success-stamp">Paid & Cleared</span>
            </div>
            <table class="details-table">
              <tr>
                <td class="label">Date / Time</td>
                <td class="val">${new Date().toLocaleString()}</td>
              </tr>
              <tr>
                <td class="label">Payment Method</td>
                <td class="val">${method}</td>
              </tr>
              <tr>
                <td class="label">Base Rent</td>
                <td class="val">$${amountNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td class="label">Processing Fee</td>
                <td class="val">$${fee.toFixed(2)}</td>
              </tr>
              <tr style="border-top: 1px solid #e5e7eb;">
                <td class="label" style="font-size:12px; font-weight:800; color:#111827;">Total Charged</td>
                <td class="val total-val">$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </table>
            <div class="footer">
              Thank you for your rent payment!<br>${profile?.companyName || 'Property Management System'}
            </div>
          </div>
          <div style="text-align:center; margin-top:20px;" class="no-print">
            <button onclick="window.print()" style="padding:8px 16px; font-size:12px; font-weight:bold; cursor:pointer;">Print Receipt</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('processing');
    setProcessingMsg('Initializing SSL handshaking...');
    
    setTimeout(() => {
      setProcessingMsg('Verifying security credentials...');
      setTimeout(() => {
        setProcessingMsg('Authorizing transaction with secure gateway...');
        setTimeout(() => {
          payMutation.mutate();
        }, 1200);
      }, 1000);
    }, 800);
  };

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'date', header: 'Date', id: 'date' },
    {
      accessorKey: 'type',
      header: t('tenantPayments.colType'),
      id: 'type',
      cell: ({ row }) => {
        const type = row.original.type;
        return (
          <span className={clsx(
            "text-[10px] font-black px-2.5 py-0.5 rounded-full border",
            type === 'Invoice' && "text-blue-500 bg-blue-500/10 border-blue-500/20",
            type === 'Payment' && "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
            type === 'Charge' && "text-amber-500 bg-amber-500/10 border-amber-500/20",
            type === 'Credit' && "text-purple-500 bg-purple-500/10 border-purple-500/20",
            type === 'Adjustment' && "text-slate-500 bg-slate-500/10 border-slate-500/20",
          )}>
            {type}
          </span>
        );
      }
    },
    { accessorKey: 'desc', header: 'Description', id: 'desc' },
    { accessorKey: 'ref', header: 'Reference Number', id: 'ref', cell: ({ row }) => <span className="font-mono text-[10px]">{row.original.ref}</span> },
    {
      accessorKey: 'invoiceAmt',
      header: t('tenantPayments.colInvoiceAmt'),
      id: 'invoiceAmt',
      cell: ({ row }) => row.original.invoiceAmt > 0 ? <span className="font-semibold">${row.original.invoiceAmt.toLocaleString(undefined, {minimumFractionDigits: 2})}</span> : '-',
    },
    {
      accessorKey: 'paymentAmt',
      header: t('tenantPayments.colPaymentAmt'),
      id: 'paymentAmt',
      cell: ({ row }) => row.original.paymentAmt > 0 ? <span className="text-emerald-500 font-bold">-${row.original.paymentAmt.toLocaleString(undefined, {minimumFractionDigits: 2})}</span> : '-',
    },
    {
      accessorKey: 'additionalChg',
      header: t('tenantPayments.colAdditionalChg'),
      id: 'additionalChg',
      cell: ({ row }) => row.original.additionalChg > 0 ? <span className="text-rose-500 font-bold">+${row.original.additionalChg.toLocaleString(undefined, {minimumFractionDigits: 2})}</span> : '-',
    },
    {
      accessorKey: 'balance',
      header: t('tenantPayments.colRunningBal'),
      id: 'balance',
      cell: ({ row }) => (
        <span className={row.original.balance >= 0 ? 'text-slate-700 dark:text-white font-black' : 'text-rose-500 font-black'}>
          {row.original.balance < 0 ? '-' : ''}${Math.abs(row.original.balance).toLocaleString(undefined, {minimumFractionDigits: 2})}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      id: 'status',
      cell: ({ row }) => (
        <span className={clsx(
          "text-[10px] font-black px-2 py-0.5 rounded border",
          row.original.status === 'Paid' || row.original.status === 'Cleared' || row.original.status === 'Applied'
            ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
            : row.original.status === 'Pending'
              ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
              : "text-rose-500 bg-rose-500/10 border-rose-500/20"
        )}>
          {row.original.status}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('tenantPayments.title')}
        description={t('tenantPayments.desc')}
        breadcrumbs={[
          { label: t('ai.breadcrumbs.home'), href: '/tenant' },
          { label: t('tenant.nav.payments') },
        ]}
        action={{
          label: t('tenantPayments.submitPayment'),
          onClick: () => setIsOpen(true),
          icon: <CreditCard className="w-4.5 h-4.5" />,
        }}
      />

      <Tabs defaultValue="payment" className="space-y-6">
        <TabsList className="mb-2">
          <TabsTrigger value="payment">{t('tenantPayments.tabPayment')}</TabsTrigger>
          <TabsTrigger value="ledger">{t('tenantPayments.tabLedger')}</TabsTrigger>
        </TabsList>

        <TabsContent value="payment" className="space-y-6 outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Outstanding Rent balance */}
            <Card className="md:col-span-2 p-5 border bg-card flex justify-between items-center text-xs font-semibold">
              <div>
                <h4 className="font-extrabold uppercase text-muted-foreground text-[10px]">{t('tenantPayments.outstandingBalance')}</h4>
                <p className={`text-3xl font-black mt-2 flex items-center gap-1.5 ${outstandingBalance > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  ${outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  {outstandingBalance === 0 && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{t('tenantPayments.nextInvoice')}</p>
              </div>
              <Button 
                disabled={outstandingBalance === 0} 
                onClick={() => {
                  setPaymentOption('full');
                  setIsOpen(true);
                }}
                variant={outstandingBalance > 0 ? 'default' : 'outline'} 
                className={outstandingBalance > 0 ? '' : 'border-slate-200 dark:border-white/10 text-muted-foreground bg-transparent'}
              >
                {outstandingBalance > 0 ? t('tenantPayments.payRent') : t('tenantPayments.noBalance')}
              </Button>
            </Card>

            {/* Autopay status card */}
            <Card className="md:col-span-1 p-5 border bg-card space-y-3 text-xs font-semibold">
              <div className="flex items-center space-x-2 border-b pb-2">
                <Landmark className="w-5 h-5 text-emerald-500 shrink-0" />
                <h4 className="font-extrabold uppercase">{t('tenantPayments.autopaySetup')}</h4>
              </div>
              <div className="flex justify-between items-center">
                <span>{t('tenantPayments.status')}</span>
                <span className="text-emerald-500 font-extrabold uppercase text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{t('tenantPayments.enabled')}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">{t('tenantPayments.autopayDesc')}</p>
            </Card>
          </div>

          <div className="bg-card border rounded-2xl p-5 space-y-4">
            <div className="text-xs font-bold text-muted-foreground uppercase">{t('tenantPayments.ledger')}</div>
            <DataTable columns={columns} data={filteredLedger} loading={isLoading} />
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="outline-none">
          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6" id="printable-tenant-ledger-area">
            <style>{`
              @page {
                size: A4 portrait;
                margin: 15mm;
              }
              @media print {
                body {
                  background: white !important;
                  color: black !important;
                }
                body * {
                  visibility: hidden !important;
                }
                #printable-tenant-ledger-area, #printable-tenant-ledger-area * {
                  visibility: visible !important;
                }
                #printable-tenant-ledger-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  border: none !important;
                  box-shadow: none !important;
                  background: white !important;
                  color: black !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }
                .no-print {
                  display: none !important;
                }
                table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                }
                th, td {
                  border-bottom: 1px solid #e2e8f0 !important;
                  padding: 8px 4px !important;
                  color: black !important;
                }
                th {
                  font-weight: 800 !important;
                }
              }
            `}</style>

            <div className="flex justify-between items-center border-b pb-4 no-print gap-2 flex-wrap">
              <h3 className="font-black text-sm uppercase tracking-wider text-muted-foreground">{t('tenantPayments.tabLedger')}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => window.print()} className="text-[10px] font-bold flex items-center gap-1.5 h-8">
                  <Printer className="w-3.5 h-3.5" /> {t('tenantPayments.printStatement')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="text-[10px] font-bold flex items-center gap-1.5 h-8">
                  <span className="text-rose-500 font-extrabold">PDF</span> {t('tenantPayments.btnDownloadPDF')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportCSV} className="text-[10px] font-bold flex items-center gap-1.5 h-8">
                  <span className="text-emerald-500 font-extrabold">CSV</span> {t('tenantPayments.btnExportCSV')}
                </Button>
              </div>
            </div>

            {/* Statement Info Header Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-6 text-xs">
              {/* Company Info */}
              <div className="space-y-2">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">{t('tenantPayments.companyName')}</span>
                <p className="font-black text-sm text-primary">{profile?.companyName || globalCompanyName || 'Divine Properties'}</p>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mt-4">{t('tenantPayments.companyAddress')}</span>
                <p className="font-bold text-muted-foreground leading-relaxed whitespace-pre-line">{profile?.companyAddress || globalCompanyAddress || '100 Congress Ave,\nAustin, TX 78701'}</p>
              </div>

              {/* Tenant & Unit Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">{t('tenantPayments.tenantName')}</span>
                  <p className="font-black text-foreground">{tenantName}</p>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mt-4">{t('tenantPayments.emailAddress')}</span>
                  <p className="font-semibold text-muted-foreground truncate">{profile?.email || 'sarah.c@skyline-rentals.com'}</p>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mt-4">{t('tenantPayments.phoneNumber')}</span>
                  <p className="font-semibold text-muted-foreground">{profile?.phone || '(512) 555-0011'}</p>
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">{t('tenantPayments.tenantAddress')}</span>
                  <p className="font-bold text-muted-foreground leading-relaxed whitespace-pre-line">{profile?.tenantAddress || '304 Skyline Luxury Lofts,\nAustin, TX 78702'}</p>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mt-4">{t('tenantPayments.unitDetails')}</span>
                  <p className="font-black text-primary uppercase">{profile?.unitDetails || 'Apt 304'}</p>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mt-4">{t('tenantPayments.statementDate')}</span>
                  <p className="font-semibold text-muted-foreground">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 no-print">
              <Card className="p-4 border bg-card flex flex-col justify-between text-xs font-semibold">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('tenantPayments.totalInvoiced')}</span>
                <p className="text-xl font-black mt-2 text-blue-500">${ledgerMetrics.totalInvoiced.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </Card>
              <Card className="p-4 border bg-card flex flex-col justify-between text-xs font-semibold">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('tenantPayments.totalPayments')}</span>
                <p className="text-xl font-black mt-2 text-emerald-500">${ledgerMetrics.totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </Card>
              <Card className="p-4 border bg-card flex flex-col justify-between text-xs font-semibold">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('tenantPayments.totalCharges')}</span>
                <p className="text-xl font-black mt-2 text-amber-500">${ledgerMetrics.totalCharges.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </Card>
              <Card className={`p-4 border flex flex-col justify-between text-xs font-semibold ${ledgerMetrics.currentBal > 0 ? 'bg-rose-500/5 border-rose-500/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{t('tenantPayments.outstandingBal')}</span>
                <p className={`text-xl font-black mt-2 ${ledgerMetrics.currentBal > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  ${ledgerMetrics.currentBal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </p>
              </Card>
            </div>

            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl border mb-6 no-print text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">{t('tenantPayments.filterStartDate')}</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 bg-card text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">{t('tenantPayments.filterEndDate')}</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 bg-card text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">{t('tenantPayments.filterType')}</label>
                <Select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="h-9 bg-card text-xs font-bold">
                  <option value="All">All Transactions</option>
                  <option value="Invoice">Invoices</option>
                  <option value="Payment">Payments</option>
                  <option value="Charge">Additional Charges</option>
                  <option value="Credit">Credits</option>
                  <option value="Adjustment">Adjustments</option>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">{t('tenantPayments.filterSearchRef')}</label>
                <Input type="text" placeholder="E.g. INV-2026" value={searchRef} onChange={e => setSearchRef(e.target.value)} className="h-9 bg-card text-xs font-bold" />
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h4 className="font-extrabold uppercase text-[10px] text-muted-foreground tracking-wider">{t('tenantPayments.tabLedger')}</h4>
              <DataTable columns={columns} data={filteredLedger} loading={isLoading} />
            </div>

            {/* Statement Summary Section (Footer) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/20 p-4.5 rounded-xl border border-border/80 text-xs font-bold mt-6">
              <div className="space-y-1">
                <span className="text-[9px] text-muted-foreground uppercase block">{t('tenantPayments.summaryTotalInvoiced')}</span>
                <p className="text-sm font-black text-blue-500">${ledgerMetrics.totalInvoiced.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-muted-foreground uppercase block">{t('tenantPayments.summaryTotalPaid')}</span>
                <p className="text-sm font-black text-emerald-500">${ledgerMetrics.totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-muted-foreground uppercase block">{t('tenantPayments.summaryTotalCharges')}</span>
                <p className="text-sm font-black text-amber-500">${ledgerMetrics.totalCharges.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] text-muted-foreground uppercase block">{t('tenantPayments.summaryClosingBal')}</span>
                <p className={`text-sm font-black ${ledgerMetrics.currentBal > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  ${ledgerMetrics.currentBal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* RENT PAYMENT DIALOG */}
      <FormDialog open={isOpen} onOpenChange={(val) => {
        setIsOpen(val);
        if (!val) {
          setStep('details');
          setReceiptNumber('');
        }
      }} title={step === 'receipt' ? t('tenantPayments.paymentReceipt') : t('tenantPayments.submitPayment')}>
        {step === 'details' && (
          <form onSubmit={handlePaymentSubmit} className="space-y-4 pt-2 text-xs font-semibold text-foreground">
            
            {/* Payment Option Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase block">{t('tenantPayments.paymentOption')}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  key="opt-full"
                  type="button"
                  onClick={() => setPaymentOption('full')}
                  className={`p-3 border rounded-xl flex flex-col items-center justify-center text-center gap-1 transition ${
                    paymentOption === 'full' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="font-extrabold text-[10px] uppercase">{t('tenantPayments.payInFull')}</span>
                  <span className="text-[9px] text-muted-foreground font-semibold">
                    ${outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </button>
                <button
                  key="opt-partial"
                  type="button"
                  onClick={() => {
                    setPaymentOption('partial');
                    setAmount((outstandingBalance * 0.5).toFixed(0));
                  }}
                  className={`p-3 border rounded-xl flex flex-col items-center justify-center text-center gap-1 transition ${
                    paymentOption === 'partial' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="font-extrabold text-[10px] uppercase">{t('tenantPayments.partialPayment')}</span>
                  <span className="text-[9px] text-muted-foreground font-semibold">{t('tenantPayments.payCustomAmount')}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">{t('tenantPayments.paymentAmount')}</label>
              <Input 
                type="number" 
                required 
                min="1" 
                max={outstandingBalance} 
                disabled={paymentOption === 'full'}
                value={amount} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (Number(val) > outstandingBalance) {
                    setAmount(outstandingBalance.toString());
                  } else {
                    setAmount(val);
                  }
                }} 
              />
              {paymentOption === 'partial' && (
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-semibold">
                  <span>{t('tenantPayments.max')}: ${outstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span>{t('tenantPayments.remainingBalance')}: <span className="text-amber-500 font-bold">${Math.max(0, outstandingBalance - amountNum).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase block">{t('tenantPayments.paymentMethod')}</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'ACH', label: t('tenantPayments.achBank'), desc: '$0.00 fee', icon: <Landmark className="w-5 h-5" /> },
                  { id: 'Credit Card', label: t('tenantPayments.creditCard'), desc: '2.9% fee', icon: <CreditCard className="w-5 h-5" /> },
                  { id: 'Debit Card', label: t('tenantPayments.debitCard'), desc: '$4.99 fee', icon: <CreditCard className="w-5 h-5 text-indigo-500" /> },
                ].map((tItem) => (
                  <button
                    key={tItem.id}
                    type="button"
                    onClick={() => setMethod(tItem.id as any)}
                    className={`p-3 border rounded-xl flex flex-col items-center justify-center text-center gap-1 transition ${
                      method === tItem.id ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {tItem.icon}
                    <span className="font-extrabold text-[10px] uppercase leading-none">{tItem.label}</span>
                    <span className="text-[9px] text-muted-foreground font-semibold">{tItem.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Inputs based on Payment Method */}
            {method === 'ACH' ? (
              <div className="space-y-3 p-3 bg-secondary/15 rounded-xl border border-border">
                <p className="text-[10px] font-extrabold uppercase text-primary">{t('tenantPayments.achInfo')}</p>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">{t('tenantPayments.holderName')}</label>
                  <Input required placeholder="E.g., Jane Doe" value={achHolderName} onChange={e => setAchHolderName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">{t('tenantPayments.bank')}</label>
                    <Select required value={achBankName} onChange={e => setAchBankName(e.target.value)}>
                      <option value="">Select your bank</option>
                      <option value="Chase">Chase</option>
                      <option value="Bank of America">Bank of America</option>
                      <option value="Wells Fargo">Wells Fargo</option>
                      <option value="Citibank">Citibank</option>
                      <option value="Capital One">Capital One</option>
                      <option value="US Bank">U.S. Bank</option>
                      <option value="PNC Bank">PNC Bank</option>
                      <option value="TD Bank">TD Bank</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">{t('tenantPayments.accountType')}</label>
                    <Select value={achAccountType} onChange={e => setAchAccountType(e.target.value)}>
                      <option value="Checking">{t('tenantPayments.checking')}</option>
                      <option value="Savings">{t('tenantPayments.savings')}</option>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">{t('tenantPayments.routingNumber')}</label>
                    <Input required placeholder="9-digit routing" maxLength={9} value={achRoutingNumber} onChange={e => setAchRoutingNumber(e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">{t('tenantPayments.accountNumber')}</label>
                    <Input required placeholder="Account number" value={achAccountNumber} onChange={e => setAchAccountNumber(e.target.value.replace(/\D/g, ''))} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-3 bg-secondary/15 rounded-xl border border-border">
                <p className="text-[10px] font-extrabold uppercase text-primary">{t('tenantPayments.cardDetails')}</p>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">{t('tenantPayments.holderName')}</label>
                  <Input required placeholder="E.g., Jane Doe" value={cardholderName} onChange={e => setCardholderName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground">{t('tenantPayments.cardNumber')}</label>
                  <div className="relative">
                    <Input required placeholder="4111 2222 3333 4444" maxLength={19} value={cardNumber} onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
                      setCardNumber(formatted.substring(0, 19));
                    }} />
                    <CreditCard className="absolute right-3 top-2.5 w-4.5 h-4.5 text-muted-foreground opacity-60 pointer-events-none" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1 col-span-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">{t('tenantPayments.expiry')}</label>
                    <Input required placeholder="MM/YY" maxLength={5} value={cardExpiry} onChange={e => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 2) {
                        val = val.substring(0,2) + '/' + val.substring(2,4);
                      }
                      setCardExpiry(val);
                    }} />
                  </div>
                  <div className="space-y-1 col-span-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">{t('tenantPayments.cvv')}</label>
                    <Input required placeholder="123" type="password" maxLength={4} value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <div className="space-y-1 col-span-1">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground">{t('tenantPayments.billingZip')}</label>
                    <Input required placeholder="12345" maxLength={5} value={cardZip} onChange={e => setCardZip(e.target.value.replace(/\D/g, ''))} />
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Fee & Total Summary */}
            <div className="p-3 bg-secondary/10 border border-border rounded-xl space-y-1 text-xs font-semibold">
              <div className="flex justify-between text-muted-foreground">
                <span>{t('tenantPayments.baseRentAmount')}</span>
                <span>${amountNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>{t('tenantPayments.convenienceFee')} ({method})</span>
                <span>${fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-foreground font-bold border-t pt-1 mt-1">
                <span>{t('tenantPayments.totalCharge')}</span>
                <span className="text-emerald-500 font-extrabold">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Trust Indicator */}
            <div className="flex items-center justify-center gap-1 text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>{t('tenantPayments.securedTransaction')}</span>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t('tenantPayments.cancel')}</Button>
              <Button type="submit" disabled={amountNum <= 0 || amountNum > outstandingBalance}>
                {t('tenantPayments.payRent')}
              </Button>
            </div>

          </form>
        )}

        {step === 'processing' && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="font-bold text-sm text-foreground">{t('tenantPayments.processingPayment')}</p>
            <p className="text-[10px] text-muted-foreground">{processingMsg}</p>
            <div className="flex items-center gap-1 text-[9px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase tracking-wider mt-2">
              <Shield className="w-3.5 h-3.5" />
              <span>{t('tenantPayments.securedGateway')}</span>
            </div>
          </div>
        )}

        {step === 'receipt' && (
          <div className="space-y-4 pt-2 text-xs font-semibold text-foreground animate-fade-in">
            <div className="text-center space-y-2 py-4">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="font-extrabold text-base text-emerald-500">{t('tenantPayments.paymentSuccessful')}</h3>
              <p className="text-[10px] text-muted-foreground">{t('tenantPayments.invoiceSettled')}</p>
            </div>

            <div className="p-4 bg-secondary/15 rounded-xl border border-border space-y-3 font-semibold text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t('tenantPayments.receiptNumber')}</span>
                <span className="font-mono text-foreground font-bold">{receiptNumber}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t('tenantPayments.paymentMethod')}</span>
                <span>{method}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t('tenantPayments.dateTime')}</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t('tenantPayments.baseRentAmount')}</span>
                <span>${amountNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">{t('tenantPayments.convenienceFee')}</span>
                <span>${fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-foreground font-bold">{t('tenantPayments.totalCharge')}</span>
                <span className="text-emerald-500 font-extrabold text-sm">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handlePrint} className="flex items-center gap-1.5 text-xs font-semibold">
                <Printer className="w-4.5 h-4.5" /> {t('tenantPayments.printReceipt')}
              </Button>
              <Button onClick={() => {
                setIsOpen(false);
                setStep('details');
              }}>
                {t('tenantPayments.close')}
              </Button>
            </div>
          </div>
        )}
      </FormDialog>
    </div>
  );
};

// Reusable card container fallback helper
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={clsx('bg-card border rounded-2xl p-5', className)}>
    {children}
  </div>
);
export default TenantPaymentsPage;
