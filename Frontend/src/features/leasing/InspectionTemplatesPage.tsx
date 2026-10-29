import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { PageHeader } from '../../components/PageHeader';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  Plus, PlusCircle, Trash, Trash2, ToggleLeft, ToggleRight,
  Eye, Edit, Save, ArrowLeft, ListTodo, ClipboardList, CheckSquare, Copy
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export const InspectionTemplatesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);

  // Form states for template creation/editing
  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: 'MOVE_IN' as 'MOVE_IN' | 'MOVE_OUT' | 'ROUTINE' | 'INSPECTION_ASSIGN',
    description: '',
    active: true,
  });

  // Rooms and Items in current builder state
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
  const [rooms, setRooms] = useState<BuilderRoom[]>([]);

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['inspectionTemplates'],
    queryFn: () => api.inspectionTemplates.getAll(),
  });

  // Delete Mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => api.inspectionTemplates.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspectionTemplates'] });
      setTemplateToDelete(null);
    },
  });

  // Toggle Active Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api.inspectionTemplates.toggleActive(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspectionTemplates'] });
    },
  });

  // Save Mutation
  const saveTemplateMutation = useMutation({
    mutationFn: (data: any) => {
      if (activeTab === 'edit' && selectedTemplateId) {
        return api.inspectionTemplates.update(selectedTemplateId, data);
      }
      return api.inspectionTemplates.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspectionTemplates'] });
      setActiveTab('list');
      resetForm();
    },
  });

  // Duplicate Room Mutation
  const duplicateRoomMutation = useMutation({
    mutationFn: (roomId: string) => api.inspectionTemplates.duplicateRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspectionTemplates'] });
      if (selectedTemplateId) {
        // Reload template if in edit mode
        loadTemplateForEdit(selectedTemplateId);
      }
    },
  });

  const resetForm = () => {
    setTemplateForm({ name: '', type: 'MOVE_IN', description: '', active: true });
    setRooms([]);
    setSelectedTemplateId(null);
  };

  const handleCreateNew = () => {
    resetForm();
    // Pre-populate with standard starter rooms & items for a WhatsLandlord style inspection
    setRooms([
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
          { label: 'Microwave & Dishwasher', required: false, sortOrder: 7 },
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
    ]);
    setActiveTab('create');
  };

  const loadTemplateForEdit = async (id: string) => {
    try {
      const template = await api.inspectionTemplates.getById(id);
      if (template) {
        setTemplateForm({
          name: template.name,
          type: template.type,
          description: template.description || '',
          active: template.active,
        });
        setRooms(template.rooms || []);
        setSelectedTemplateId(id);
        setActiveTab('edit');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRoom = () => {
    setRooms(prev => [...prev, { name: `New Room ${prev.length + 1}`, sortOrder: prev.length, items: [] }]);
  };

  const handleRemoveRoom = (index: number) => {
    setRooms(prev => prev.filter((_, i) => i !== index));
  };

  const handleDuplicateRoomLocal = (index: number) => {
    const roomToDuplicate = rooms[index];
    const newRoom: BuilderRoom = {
      ...roomToDuplicate,
      name: `${roomToDuplicate.name} (Copy)`,
      sortOrder: rooms.length,
      items: roomToDuplicate.items.map(item => ({ ...item })),
    };
    setRooms(prev => [...prev, newRoom]);
  };

  const handleRoomNameChange = (index: number, newName: string) => {
    setRooms(prev => prev.map((r, i) => i === index ? { ...r, name: newName } : r));
  };

  const handleAddItem = (roomIndex: number) => {
    setRooms(prev => prev.map((r, rI) => {
      if (rI !== roomIndex) return r;
      return {
        ...r,
        items: [...r.items, { label: 'New Checklist Item', required: false, sortOrder: r.items.length }]
      };
    }));
  };

  const handleRemoveItem = (roomIndex: number, itemIndex: number) => {
    setRooms(prev => prev.map((r, rI) => {
      if (rI !== roomIndex) return r;
      return {
        ...r,
        items: r.items.filter((_, i) => i !== itemIndex)
      };
    }));
  };

  const handleItemChange = (roomIndex: number, itemIndex: number, field: keyof BuilderItem, value: any) => {
    setRooms(prev => prev.map((r, rI) => {
      if (rI !== roomIndex) return r;
      return {
        ...r,
        items: r.items.map((item, i) => i === itemIndex ? { ...item, [field]: value } : item)
      };
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name) return;
    saveTemplateMutation.mutate({
      ...templateForm,
      rooms,
    });
  };

  return (
    <div className="space-y-6">
      {activeTab === 'list' ? (
        <>
          <PageHeader
            title="Inspection Templates"
            description="Manage reusable structural checklists for move-ins, move-outs, and periodic inspections."
            breadcrumbs={[
              { label: 'Home', href: '/' },
              { label: 'Leasing', href: '/leasing/move-in' },
              { label: 'Templates' },
            ]}
            action={{
              label: 'Create Template',
              onClick: handleCreateNew,
              icon: <Plus className="w-4 h-4" />
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-full py-12 flex justify-center text-muted-foreground text-sm font-semibold">
                Loading templates...
              </div>
            ) : templates.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-card border rounded-2xl p-8 space-y-4">
                <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto" />
                <h3 className="font-extrabold text-base">No Templates Yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">Create checklists to capture structural details of property rooms and items before performing move-in/move-out workflows.</p>
                <Button onClick={handleCreateNew} size="sm"><Plus className="w-4 h-4 mr-2" /> Build First Template</Button>
              </div>
            ) : (
              templates.map((tpl: any) => (
                <div key={tpl.id} className={`bg-card border rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${!tpl.active ? 'opacity-65' : ''}`}>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className={`text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-full uppercase bg-primary/10 text-primary`}>
                          {tpl.type.replace('_', ' ')}
                        </span>
                        <h3 className="text-sm font-extrabold text-foreground">{tpl.name}</h3>
                      </div>
                      <button 
                        onClick={() => toggleActiveMutation.mutate({ id: tpl.id, active: !tpl.active })}
                        className="text-muted-foreground hover:text-foreground"
                        title={tpl.active ? 'Deactivate Template' : 'Activate Template'}
                      >
                        {tpl.active ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6" />}
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2">{tpl.description || 'No description provided.'}</p>

                    <div className="flex items-center space-x-4 text-[10px] text-muted-foreground font-bold">
                      <span className="flex items-center"><CheckSquare className="w-3.5 h-3.5 mr-1" /> {tpl.rooms?.length || 0} Rooms</span>
                      <span>Created By: {tpl.createdBy || 'System'}</span>
                    </div>
                  </div>

                  <div className="bg-muted/40 px-6 py-3 border-t flex justify-end space-x-1.5">
                    <Button variant="ghost" size="sm" onClick={() => loadTemplateForEdit(tpl.id)}><Edit className="w-3.5 h-3.5 mr-1" /> Edit</Button>
                    <Button variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10" onClick={() => setTemplateToDelete({ id: tpl.id, name: tpl.name })}>
                      <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" /> Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <form onSubmit={handleSave} className="space-y-6 max-w-5xl">
          <PageHeader
            title={activeTab === 'edit' ? 'Modify Inspection Template' : 'Create Inspection Template'}
            description="Define property rooms and checklist items to create snapshot templates."
            breadcrumbs={[
              { label: 'Templates', href: '#' },
              { label: activeTab === 'edit' ? 'Edit' : 'New' },
            ]}
          />

          <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6 text-foreground">
            <h2 className="text-xs font-extrabold uppercase tracking-widest border-b pb-2 text-primary">Template Attributes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Template Name</label>
                <input 
                  required
                  placeholder="e.g. Standard 2 Bedroom Apartment"
                  value={templateForm.name}
                  onChange={e => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Inspection Category</label>
                <select
                  value={templateForm.type}
                  onChange={e => setTemplateForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none"
                >
                  <option value="MOVE_IN">Move In Checklist</option>
                  <option value="MOVE_OUT">Move Out Checklist</option>
                  <option value="ROUTINE">Routine Inspection</option>
                  <option value="INSPECTION_ASSIGN">Inspection Assign</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Description</label>
                <input 
                  placeholder="Brief summary of template scope..."
                  value={templateForm.description}
                  onChange={e => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2.5 rounded border bg-secondary text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-primary">Checklist Configuration</h3>
              <Button type="button" variant="outline" size="sm" onClick={handleAddRoom}>
                <Plus className="w-4 h-4 mr-2" /> Add Room Section
              </Button>
            </div>

            {rooms.length === 0 ? (
              <div className="py-12 border border-dashed rounded-2xl text-center text-muted-foreground text-xs font-semibold">
                No room sections configured yet. Add a room to build your structural checklist.
              </div>
            ) : (
              <div className="space-y-6">
                {rooms.map((room, rIndex) => (
                  <div key={rIndex} className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                    <div className="bg-muted/30 px-6 py-4 border-b flex justify-between items-center">
                      <div className="flex items-center space-x-3 w-1/3">
                        <ListTodo className="w-4 h-4 text-primary" />
                        <input
                          required
                          value={room.name}
                          onChange={e => handleRoomNameChange(rIndex, e.target.value)}
                          placeholder="e.g. Kitchen, Living Room..."
                          className="bg-transparent border-b border-transparent hover:border-border focus:border-primary font-bold text-xs focus:outline-none p-0.5 w-full"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleAddItem(rIndex)}>
                          <PlusCircle className="w-3.5 h-3.5 mr-1" /> Add Item
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleDuplicateRoomLocal(rIndex)}>
                          <Copy className="w-3.5 h-3.5 mr-1" /> Duplicate Room
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600" onClick={() => handleRemoveRoom(rIndex)}>
                          <Trash className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-6 divide-y space-y-4">
                      {room.items.length === 0 ? (
                        <div className="text-center text-muted-foreground text-xs py-4 font-semibold">
                          No checklist items configured for this room. Click "Add Item" to add walls, ceiling, outlets, etc.
                        </div>
                      ) : (
                        room.items.map((item, iIndex) => (
                          <div key={iIndex} className="flex items-center justify-between py-2 text-xs font-semibold">
                            <input
                              required
                              value={item.label}
                              onChange={e => handleItemChange(rIndex, iIndex, 'label', e.target.value)}
                              placeholder="e.g. Outlets & Light Switches"
                              className="p-1 rounded border bg-secondary/35 text-xs w-2/3 focus:outline-none"
                            />

                            <div className="flex items-center space-x-6">
                              <label className="flex items-center space-x-2 text-[10px] uppercase font-bold text-muted-foreground cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.required}
                                  onChange={e => handleItemChange(rIndex, iIndex, 'required', e.target.checked)}
                                  className="rounded border-border text-primary focus:ring-0"
                                />
                                <span>Required</span>
                              </label>

                              <button type="button" className="text-rose-500 hover:text-rose-600" onClick={() => handleRemoveItem(rIndex, iIndex)}>
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => { setActiveTab('list'); resetForm(); }}>Cancel</Button>
            <Button type="submit" disabled={saveTemplateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" /> {activeTab === 'edit' ? 'Update Template' : 'Save Template'}
            </Button>
          </div>
        </form>
      )}

      {/* Confirm Template Delete Modal */}
      <ConfirmDialog
        open={!!templateToDelete}
        onOpenChange={(open) => !open && setTemplateToDelete(null)}
        title="Delete Inspection Template"
        description={`Are you sure you want to delete template "${templateToDelete?.name}"? All assigned rooms and checklist items will be removed.`}
        confirmText="Delete Template"
        variant="destructive"
        onConfirm={() => {
          if (templateToDelete) {
            deleteTemplateMutation.mutate(templateToDelete.id);
          }
        }}
      />
    </div>
  );
};

export default InspectionTemplatesPage;
