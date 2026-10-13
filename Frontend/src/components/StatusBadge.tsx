import React from 'react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const { t } = useTranslation();

  const getColors = (val: string) => {
    const s = (val || '').toLowerCase();
    switch (s) {
      case 'active':
      case 'activo':
      case 'occupied':
      case 'ocupado':
      case 'approved':
      case 'aprobado':
      case 'accepted':
      case 'aceptado':
      case 'paid':
      case 'pagado':
      case 'completed':
      case 'completado':
      case 'success':
      case 'éxito':
      case 'exito':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/20';
      case 'pending':
      case 'pendiente':
      case 'in progress':
      case 'en progreso':
      case 'contacted':
      case 'contactado':
      case 'partial':
      case 'parcial':
      case 'partially paid':
      case 'parcialmente pagado':
      case 'medium':
      case 'medio':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:bg-amber-500/20';
      case 'late fee':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20 dark:bg-orange-500/20';
      case 'vacant':
      case 'vacante':
      case 'new':
      case 'nuevo':
      case 'showing scheduled':
      case 'low':
      case 'bajo':
      case 'info':
        return 'bg-sky-500/10 text-sky-500 border-sky-500/20 dark:bg-sky-500/20';
      case 'overdue':
      case 'vencido':
      case 'urgent':
      case 'urgente':
      case 'high':
      case 'alto':
      case 'rejected':
      case 'rechazado':
      case 'declined':
      case 'denegado':
      case 'terminated':
      case 'terminado':
      case 'failed':
      case 'fallido':
      case 'unpaid':
      case 'no pagado':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/20 dark:bg-slate-500/20';
    }
  };

  const displayStatus = status ? t(`status.${status}`, status) : '';

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors duration-150',
        getColors(status),
        className
      )}
    >
      {displayStatus}
    </span>
  );
};
export default StatusBadge;
