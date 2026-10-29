import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { FormDialog } from '../../components/FormDialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/StatusBadge';
import { Plus, Loader2 } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

export const CommAnnouncementsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Community');
  const [audience, setAudience] = useState<'All Tenants' | 'Owners' | 'Vendors' | 'Employees'>('All Tenants');

  // Queries
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['comm-announcements-list'],
    queryFn: () => api.announcements.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      return api.announcements.create({
        title,
        content: content || title,
        category,
        audience,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comm-announcements-list'] });
      setIsOpen(false);
      setTitle('');
      setContent('');
    },
  });

  const filteredAnn = (Array.isArray(announcements) ? announcements : []).filter((ann: any) => {
    if (!ann) return false;
    const q = (searchQuery || '').toLowerCase().trim();
    return !q ||
      String(ann.title || '').toLowerCase().includes(q) ||
      String(ann.content || '').toLowerCase().includes(q) ||
      String(ann.category || '').toLowerCase().includes(q) ||
      String(ann.audience || '').toLowerCase().includes(q);
  });

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'createdAt',
      header: 'Publish Date',
      id: 'date',
      cell: ({ row }) => {
        const val = row.original.createdAt || row.original.publishDate;
        return <span>{val ? new Date(val).toLocaleDateString() : 'Today'}</span>;
      },
    },
    {
      accessorKey: 'title',
      header: 'Notice Title',
      id: 'title',
      cell: ({ row }) => (
        <div>
          <span className="font-bold text-foreground block">{row.original.title}</span>
          {row.original.content && (
            <span className="text-xs text-muted-foreground line-clamp-1">{row.original.content}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      id: 'category',
      cell: ({ row }) => (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          {row.original.category || 'General'}
        </span>
      ),
    },
    {
      accessorKey: 'audience',
      header: 'Target Audience',
      id: 'audience',
      cell: ({ row }) => <span>{row.original.audience || 'All Tenants & Residents'}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      id: 'status',
      cell: () => <StatusBadge status="Active" />,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Notice Board & Announcements"
        description="Verify published community notices, fire alarm drills alerts, or schedule new announcements."
        breadcrumbs={[
          { label: 'Home', href: '/communication' },
          { label: 'Announcements' },
        ]}
        action={{
          label: 'Create Notice Announcement',
          onClick: () => setIsOpen(true),
          icon: <Plus className="w-4.5 h-4.5" />,
        }}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search notices by title or content..."
        onReset={() => setSearchQuery('')}
      />

      <DataTable columns={columns} data={filteredAnn} loading={isLoading} />

      {/* CREATE DIALOG */}
      <FormDialog open={isOpen} onOpenChange={setIsOpen} title="Create Notice Announcement">
        <div className="space-y-4 pt-2 text-xs font-semibold text-foreground">
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Notice Title</label>
            <Input
              placeholder="E.g., HVAC seasonal maintenance check"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-muted-foreground uppercase">Notice Details & Instructions</label>
            <textarea
              className="w-full min-h-[90px] p-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground"
              placeholder="Provide complete details, date/time, and safety instructions for residents..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Category</label>
              <Select value={category} onChange={(e: any) => setCategory(e.target.value)}>
                <option value="Community">Community Events</option>
                <option value="Emergency">Emergency Safety</option>
                <option value="Maintenance">Maintenance Upgrades</option>
                <option value="Security">Security Warnings</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground uppercase">Target Audience Group</label>
              <Select value={audience} onChange={(e: any) => setAudience(e.target.value)}>
                <option value="All Tenants">All Tenants Residents</option>
                <option value="Owners">Portfolio Owners</option>
                <option value="Vendors">Registered Contractors</option>
                <option value="Employees">Management Staff</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!title.trim() || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Publish Notice
            </Button>
          </div>

        </div>
      </FormDialog>
    </div>
  );
};
export default CommAnnouncementsPage;
