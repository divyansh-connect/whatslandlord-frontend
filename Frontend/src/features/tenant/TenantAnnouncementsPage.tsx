import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { AnnouncementCard } from '../../components/TenantComponents';
import { FilterBar } from '../../components/FilterBar';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';

export const TenantAnnouncementsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Pure Live Backend Query - Zero Mock
  const { data: rawAnnouncements = [], isLoading } = useQuery({
    queryKey: ['tenant-announcements-list'],
    queryFn: () => api.announcements.getAll(),
  });

  const announcements = Array.isArray(rawAnnouncements) ? rawAnnouncements : [];

  const filteredAnn = announcements.filter((ann: any) => {
    const searchMatch = (ann.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ann.content || ann.body || '').toLowerCase().includes(searchQuery.toLowerCase());
    const catMatch = categoryFilter === '' || ann.category === categoryFilter;
    return searchMatch && catMatch;
  });

  if (isLoading) {
    return <LoadingSkeleton type="card" />;
  }

  return (
    <div className="space-y-6 text-foreground">
      <PageHeader
        title="Community Announcements"
        description="Verify seasonal elevator upgrades, safety announcements, fire drills schedules, or community parties."
        breadcrumbs={[
          { label: 'Home', href: '/tenant' },
          { label: 'Announcements' },
        ]}
      />

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search announcements..."
        filters={[
          {
            key: 'category',
            value: categoryFilter,
            placeholder: 'Announcement Category',
            options: [
              { label: 'Community', value: 'Community' },
              { label: 'Maintenance', value: 'Maintenance' },
              { label: 'Events', value: 'Events' },
              { label: 'Safety', value: 'Safety' },
              { label: 'Emergency', value: 'Emergency' },
            ],
          },
        ]}
        onFilterChange={(key, val) => {
          if (key === 'category') setCategoryFilter(val);
        }}
        onReset={() => {
          setSearchQuery('');
          setCategoryFilter('');
        }}
      />

      {filteredAnn.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground border rounded-2xl bg-card flex flex-col items-center justify-center space-y-2">
          <p className="font-bold text-sm text-foreground">No community notices published yet</p>
          <p className="text-xs">Your property management office will broadcast maintenance alerts, fire drills, and building notices here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAnn.map((ann: any) => (
            <AnnouncementCard
              key={ann.id}
              title={ann.title}
              category={ann.category || 'General'}
              publishDate={ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : 'Recent'}
              body={ann.content || 'No description provided.'}
              priority={ann.isPinned ? 'High' : 'Normal'}
            />
          ))}
        </div>
      )}
    </div>
  );
};
export default TenantAnnouncementsPage;
