import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';

interface RoomStatusBadgeProps {
  status: 'active' | 'inactive';
  isRunning?: boolean;
  participantCount?: number;
}

export function RoomStatusBadge({ status, isRunning, participantCount }: RoomStatusBadgeProps) {
  if (status === 'inactive') {
    return (
      <Badge
        variant="secondary"
        className="bg-gray-100 text-gray-600"
        data-testid="room-status-badge"
      >
        Inactive
      </Badge>
    );
  }

  if (isRunning) {
    return (
      <div className="flex items-center gap-1.5" data-testid="room-status-badge">
        <Badge className={cn('bg-green-500 text-white hover:bg-green-600')}>Live</Badge>
        {participantCount !== undefined && participantCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {participantCount} participant{participantCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  }

  return (
    <Badge
      variant="outline"
      className="border-amber-300 bg-amber-50 text-amber-700"
      data-testid="room-status-badge"
    >
      Ready
    </Badge>
  );
}
