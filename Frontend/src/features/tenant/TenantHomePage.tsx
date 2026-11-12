import React from 'react';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/ui/Card';
import { Home, Compass, Key, ParkingMeter, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api';

export const TenantHomePage: React.FC = () => {
  const { data: profile } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: () => api.tenantProfile.get(),
  });

  return (
    <div className="space-y-6 text-foreground max-w-4xl">
      <PageHeader
        title="My Home & Amenity Guide"
        description="Verify floor assignments, parking stalls, office operation hours, and community rules."
        breadcrumbs={[
          { label: 'Home', href: '/tenant' },
          { label: 'My Home' },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Address and Details */}
        <Card className="md:col-span-2 p-6 border bg-card space-y-6">
          <div className="flex items-center space-x-3 border-b pb-4">
            <Home className="w-7 h-7 text-primary shrink-0" />
            <div>
              <h3 className="font-extrabold text-sm uppercase">{profile?.propertyName || profile?.property || 'Assigned Residence'}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-bold">
                {profile?.unitNumber ? `Unit ${profile.unitNumber}` : 'Current Lease'} {profile?.floor ? `• Floor ${profile.floor}` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                <ParkingMeter className="w-3.5 h-3.5" /> Parking Slot
              </span>
              <p className="font-bold text-foreground">Stall #42 (Level G2)</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" /> Storage locker
              </span>
              <p className="font-bold text-foreground">Locker #B (Storage Area 3)</p>
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <h4 className="font-extrabold text-xs uppercase">Community Rules Highlights</h4>
            <ul className="list-disc pl-5 text-xs text-muted-foreground font-semibold space-y-2 leading-relaxed">
              <li>Quiet hours are observed daily from 10:00 PM to 08:00 AM.</li>
              <li>Pool access requires RFID keycards; guests limit is 2 per unit.</li>
              <li>Trash valet pickups clear Sundays through Thursdays starting at 07:00 PM.</li>
            </ul>
          </div>
        </Card>

        {/* Office & Operations guide */}
        <Card className="md:col-span-1 p-6 border bg-card space-y-5 text-xs font-semibold">
          <div className="flex items-center space-x-2 border-b pb-2">
            <Clock className="w-4.5 h-4.5 text-primary shrink-0" />
            <h4 className="font-extrabold uppercase">Office Hours</h4>
          </div>
          
          <div className="space-y-2.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mon - Fri:</span>
              <span>09:00 AM - 06:00 PM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Saturday:</span>
              <span>10:00 AM - 04:00 PM</span>
            </div>
            <div className="flex justify-between text-rose-500 font-bold">
              <span>Sunday:</span>
              <span>Closed</span>
            </div>
          </div>

          <div className="space-y-2 border-t pt-4">
            <p className="text-[10px] text-muted-foreground uppercase">Emergency Contact</p>
            <p className="font-bold">(512) 555-9111</p>
            <p className="text-[10px] text-muted-foreground font-medium">For lockouts, gas leaks, or water breaks.</p>
          </div>
        </Card>

      </div>
    </div>
  );
};
export default TenantHomePage;
