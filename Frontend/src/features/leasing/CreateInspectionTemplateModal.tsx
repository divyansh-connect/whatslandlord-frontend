import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api';
import { FormDialog } from '../../components/FormDialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Plus, Trash2, Copy, Loader2, CheckSquare } from 'lucide-react';

interface BuilderItem {
  id?: string;
  label: string;
  required: boolean;
  sortOrder: number;
}

interface BuilderRoom {
  id?: string;
  name: string;
  sortOrder: number;
  items: BuilderItem[];
}

interface CreateInspectionTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newTemplateId: string) => void;
  defaultType?: 'MOVE_IN' | 'MOVE_OUT' | 'ROUTINE';
}

const defaultStarterRooms: BuilderRoom[] = [
  {
    name: 'Kitchen',
    sortOrder: 0,
    items: [
      { label: 'Walls & Baseboards', required: true, sortOrder: 0 },
      { label: 'Ceiling & Light Fixtures', required: true, sortOrder: 1 },
      { label: 'Flooring', required: true, sortOrder: 2 },
      { label: 'Countertops & Cabinets', required: true, sortOrder: 3 },
      { label: 'Sink, Faucet & Disposal', required: true, sortOrder: 4 },
      { label: 'Refrigerator & Freezer', required: true, sortOrder: 5 },
      { label: 'Stove, Oven & Range Hood', required: true, sortOrder: 6 },
    ],
  },
  {
    name: 'Living Room',
    sortOrder: 1,
    items: [
      { label: 'Walls, Doors & Windows', required: true, sortOrder: 0 },
      { label: 'Flooring (Carpet/Hardwood)', required: true, sortOrder: 1 },
      { label: 'Outlets & Light Switches', required: true, sortOrder: 2 },
      { label: 'Smoke Detector & AC Vents', required: true, sortOrder: 3 },
    ],
  },
  {
    name: 'Master Bedroom',
    sortOrder: 2,
    items: [
      { label: 'Walls, Trim & Doors', required: true, sortOrder: 0 },
      { label: 'Windows & Blinds', required: true, sortOrder: 1 },
      { label: 'Closet Shelves & Rods', required: true, sortOrder: 2 },
      { label: 'Light Fixtures & Outlets', required: true, sortOrder: 3 },
    ],
  },
  {
    name: 'Bathroom',
    sortOrder: 3,
    items: [
      { label: 'Toilet & Flusher', required: true, sortOrder: 0 },
      { label: 'Sink, Faucet & Vanity', required: true, sortOrder: 1 },
      { label: 'Shower, Tub & Tiles', required: true, sortOrder: 2 },
      { label: 'Exhaust Fan & Mirror', required: true, sortOrder: 3 },
    ],
  },
];

export const CreateInspectionTemplateModal: React.FC<CreateInspectionTemplateModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
  defaultType = 'MOVE_IN',
}) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [type, setType] = useState(defaultType);
  const [description, setDescription] = useState('');
  const [rooms, setRooms] = useState<BuilderRoom[]>(JSON.parse(JSON.stringify(defaultStarterRooms)));

  // Reset when dialog opens
  React.useEffect(() => {
    if (open) {
      setName('');
      setType(defaultType);
      setDescription('');
      setRooms(JSON.parse(JSON.stringify(defaultStarterRooms)));
    }
  }, [open, defaultType]);

  const createMutation = useMutation({
    mutationFn: (data: any) => api.inspectionTemplates.create(data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['activeInspectionTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['inspectionTemplates'] });
      const createdId = res?.id || res?.data?.id;
      if (onSuccess && createdId) {
        onSuccess(createdId);
      }
      onOpenChange(false);
    },
  });

  const handleAddRoom = () => {
    setRooms(prev => [
      ...prev,
      {
        name: `Room ${prev.length + 1}`,
        sortOrder: prev.length,
        items: [
          { label: 'Walls & Trim', required: true, sortOrder: 0 },
          { label: 'Flooring', required: true, sortOrder: 1 },
          { label: 'Light Fixtures', required: true, sortOrder: 2 },
        ],
      },
    ]);
  };

  const handleRemoveRoom = (index: number) => {
    setRooms(prev => prev.filter((_, i) => i !== index));
  };

  const handleDuplicateRoom = (index: number) => {
    const roomToDup = rooms[index];
    if (!roomToDup) return;
    setRooms(prev => [
      ...prev,
      {
        ...JSON.parse(JSON.stringify(roomToDup)),
        name: `${roomToDup.name} (Copy)`,
        sortOrder: prev.length,
      },
    ]);
  };

  const handleRoomNameChange = (index: number, val: string) => {
    setRooms(prev => prev.map((r, i) => i === index ? { ...r, name: val } : r));
  };

  const handleAddItem = (roomIndex: number) => {
    setRooms(prev => prev.map((r, rI) => {
      if (rI !== roomIndex) return r;
      return {
        ...r,
        items: [
          ...r.items,
          { label: '', required: true, sortOrder: r.items.length },
        ],
      };
    }));
  };

  const handleRemoveItem = (roomIndex: number, itemIndex: number) => {
    setRooms(prev => prev.map((r, rI) => {
      if (rI !== roomIndex) return r;
      return {
        ...r,
        items: r.items.filter((_, i) => i !== itemIndex),
      };
    }));
  };

  const handleItemChange = (roomIndex: number, itemIndex: number, field: keyof BuilderItem, value: any) => {
    setRooms(prev => prev.map((r, rI) => {
      if (rI !== roomIndex) return r;
      return {
        ...r,
        items: r.items.map((it, i) => i === itemIndex ? { ...it, [field]: value } : it),
      };
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createMutation.mutate({
      name: name.trim(),
      type,
      description: description.trim(),
      active: true,
      rooms,
    });
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Inspection Template"
      description="Define property rooms and checklist items to create a reusable template."
      className="sm:max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs font-semibold">
        {/* Template Attributes */}
        <div className="bg-secondary/15 p-4 rounded-xl space-y-4 border">
          <p className="text-[10px] font-extrabold uppercase text-primary tracking-wider">Template Attributes</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Template Name *</label>
              <Input
                placeholder="e.g. Standard 2 Bedroom Apartment"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Inspection Category</label>
              <Select value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="MOVE_IN">Move In Checklist</option>
                <option value="MOVE_OUT">Move Out Checklist</option>
                <option value="ROUTINE">Routine Inspection</option>
                <option value="INSPECTION_ASSIGN">Inspection Assign</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Description</label>
              <Input
                placeholder="Brief summary of template scope..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        </div>

        {/* Checklist Configuration */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-extrabold uppercase text-primary tracking-wider">
              Checklist Configuration ({rooms.length} Rooms)
            </p>
            <Button type="button" variant="outline" size="sm" onClick={handleAddRoom} className="h-7 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Room Section
            </Button>
          </div>

          <div className="max-h-[42vh] overflow-y-auto space-y-3 pr-1">
            {rooms.map((room, rIdx) => (
              <div key={rIdx} className="border rounded-xl p-3.5 bg-card space-y-3 shadow-xs">
                <div className="flex items-center justify-between gap-2 border-b pb-2">
                  <Input
                    value={room.name}
                    onChange={(e) => handleRoomNameChange(rIdx, e.target.value)}
                    className="font-bold text-xs h-7 max-w-xs"
                    placeholder="Room Name"
                  />
                  <div className="flex items-center space-x-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicateRoom(rIdx)}
                      className="h-7 text-[11px] px-2 text-muted-foreground"
                      title="Duplicate Room"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" /> Duplicate
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddItem(rIdx)}
                      className="h-7 text-[11px] px-2 text-primary"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                    </Button>
                    {rooms.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRoom(rIdx)}
                        className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Items in Room */}
                <div className="space-y-1.5 pl-2">
                  {room.items.map((item, iIdx) => (
                    <div key={iIdx} className="flex items-center space-x-2">
                      <Input
                        value={item.label}
                        onChange={(e) => handleItemChange(rIdx, iIdx, 'label', e.target.value)}
                        placeholder="Item (e.g. Walls, Flooring)"
                        className="text-xs h-7 flex-1"
                      />
                      <label className="flex items-center space-x-1 cursor-pointer select-none text-[10px] font-bold text-muted-foreground uppercase px-2 py-1 rounded bg-secondary/20">
                        <input
                          type="checkbox"
                          checked={item.required}
                          onChange={(e) => handleItemChange(rIdx, iIdx, 'required', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-primary focus:ring-0"
                        />
                        <span>Required</span>
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(rIdx, iIdx)}
                        className="h-6 w-6 text-muted-foreground hover:text-rose-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-3 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Template
          </Button>
        </div>
      </form>
    </FormDialog>
  );
};

export default CreateInspectionTemplateModal;

