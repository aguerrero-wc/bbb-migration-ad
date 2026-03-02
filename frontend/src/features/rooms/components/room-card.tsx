import { LogIn, Pencil, Trash2 } from 'lucide-react';

import type { Room } from '@/types';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';

import { RoomStatusBadge } from './room-status-badge';
import { useRoomStatus } from '../api/rooms-api';

interface RoomCardProps {
  room: Room;
  onEdit?: () => void;
  onDelete?: () => void;
  onJoin?: () => void;
  userRole: string;
}

export function RoomCard({ room, onEdit, onDelete, onJoin, userRole }: RoomCardProps) {
  const { data: status } = useRoomStatus(room.id, room.status === 'active');
  const canEdit = userRole === 'admin' || userRole === 'moderator';
  const canDelete = userRole === 'admin';

  return (
    <Card data-testid={`room-card-${room.id}`} className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{room.name}</CardTitle>
          <RoomStatusBadge
            status={room.status}
            isRunning={status?.isRunning}
            participantCount={status?.participantCount}
          />
        </div>
        {room.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">{room.description}</p>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        {room.createdBy && (
          <p className="text-xs text-muted-foreground">
            Created by {room.createdBy.firstName} {room.createdBy.lastName}
          </p>
        )}
      </CardContent>

      <Separator />

      <CardFooter className="gap-2 pt-4">
        <Button size="sm" onClick={onJoin} data-testid={`join-room-${room.id}`}>
          <LogIn className="mr-1.5 h-4 w-4" />
          Join
        </Button>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
            data-testid={`edit-room-${room.id}`}
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit
          </Button>
        )}
        {canDelete && (
          <Button
            size="sm"
            variant="destructive"
            onClick={onDelete}
            data-testid={`delete-room-${room.id}`}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
