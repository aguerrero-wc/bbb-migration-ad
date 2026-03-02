import { useState } from 'react';

import { Plus, Search } from 'lucide-react';

import type { Room } from '@/types';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useAuthStore } from '@/features/auth/hooks/use-auth';

import { RoomCard } from '../components/room-card';
import { RoomFormDialog } from '../components/room-form-dialog';
import { useDeleteRoom, useJoinRoom, useRooms } from '../api/rooms-api';

export function RoomsPage() {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role ?? 'viewer';
  const canCreate = userRole === 'admin' || userRole === 'moderator';

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | undefined>();

  const { data: roomsResponse, isLoading, error } = useRooms({ search: search || undefined });
  const deleteMutation = useDeleteRoom();
  const joinMutation = useJoinRoom();

  const rooms = roomsResponse?.data ?? [];

  function handleEdit(room: Room) {
    setEditingRoom(room);
    setDialogOpen(true);
  }

  function handleCreate() {
    setEditingRoom(undefined);
    setDialogOpen(true);
  }

  function handleDelete(room: Room) {
    if (window.confirm(`Are you sure you want to delete "${room.name}"?`)) {
      deleteMutation.mutate(room.id);
    }
  }

  function handleJoin(room: Room) {
    joinMutation.mutate(room.id, {
      onSuccess: (data) => {
        window.open(data.joinUrl, '_blank');
      },
    });
  }

  return (
    <div data-testid="rooms-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meeting Rooms</h1>
        {canCreate && (
          <Button onClick={handleCreate} data-testid="create-room-button">
            <Plus className="mr-1.5 h-4 w-4" />
            New Room
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search rooms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="rooms-search"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12" data-testid="rooms-loading">
          <p className="text-muted-foreground">Loading rooms...</p>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4" data-testid="rooms-error">
          <p className="text-sm text-destructive">Failed to load rooms. Please try again.</p>
        </div>
      )}

      {!isLoading && !error && rooms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12" data-testid="rooms-empty">
          <p className="text-muted-foreground">
            {search ? 'No rooms match your search.' : 'No rooms available.'}
          </p>
        </div>
      )}

      {!isLoading && rooms.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              userRole={userRole}
              onJoin={() => handleJoin(room)}
              onEdit={() => handleEdit(room)}
              onDelete={() => handleDelete(room)}
            />
          ))}
        </div>
      )}

      <RoomFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        room={editingRoom}
        onSuccess={() => setEditingRoom(undefined)}
      />
    </div>
  );
}
