import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import type { Room } from '@/types';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Switch } from '@/shared/components/ui/switch';
import { Textarea } from '@/shared/components/ui/textarea';

import { type CreateRoomFormData, createRoomSchema } from '../schemas/room-schemas';
import { useCreateRoom, useUpdateRoom } from '../api/rooms-api';

interface RoomFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room?: Room;
  onSuccess?: () => void;
}

export function RoomFormDialog({ open, onOpenChange, room, onSuccess }: RoomFormDialogProps) {
  const isEditing = !!room;
  const createMutation = useCreateRoom();
  const updateMutation = useUpdateRoom();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateRoomFormData>({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      name: '',
      description: '',
      welcomeMessage: '',
      maxParticipants: '' as unknown as number,
      record: false,
      autoStartRecording: false,
      muteOnStart: false,
      webcamsOnlyForModerator: false,
      meetingLayout: 'CUSTOM_LAYOUT',
      guestPolicy: 'ALWAYS_ACCEPT',
    },
  });

  useEffect(() => {
    if (open && room) {
      reset({
        name: room.name,
        description: room.description ?? '',
        welcomeMessage: room.welcomeMessage ?? '',
        maxParticipants: room.maxParticipants ?? ('' as unknown as number),
        record: room.record,
        autoStartRecording: room.autoStartRecording,
        muteOnStart: room.muteOnStart,
        webcamsOnlyForModerator: room.webcamsOnlyForModerator,
        meetingLayout: room.meetingLayout,
        guestPolicy: room.guestPolicy,
      });
    } else if (open) {
      reset({
        name: '',
        description: '',
        welcomeMessage: '',
        maxParticipants: '' as unknown as number,
        record: false,
        autoStartRecording: false,
        muteOnStart: false,
        webcamsOnlyForModerator: false,
        meetingLayout: 'CUSTOM_LAYOUT',
        guestPolicy: 'ALWAYS_ACCEPT',
      });
    }
  }, [open, room, reset]);

  async function onSubmit(data: CreateRoomFormData) {
    const maxParticipants =
      typeof data.maxParticipants === 'number' ? data.maxParticipants : undefined;

    const payload = {
      name: data.name,
      description: data.description || undefined,
      welcomeMessage: data.welcomeMessage || undefined,
      maxParticipants,
      record: data.record,
      autoStartRecording: data.autoStartRecording,
      muteOnStart: data.muteOnStart,
      webcamsOnlyForModerator: data.webcamsOnlyForModerator,
      meetingLayout: data.meetingLayout,
      guestPolicy: data.guestPolicy,
    };

    if (isEditing) {
      await updateMutation.mutateAsync({ id: room.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
    onSuccess?.();
  }

  const recordValue = watch('record');
  const autoStartValue = watch('autoStartRecording');
  const muteValue = watch('muteOnStart');
  const webcamsValue = watch('webcamsOnlyForModerator');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[525px]" data-testid="room-form-dialog">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Room' : 'Create Room'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the room configuration.'
              : 'Configure a new meeting room.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Room name"
              {...register('name')}
              data-testid="room-form-name"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Room description"
              {...register('description')}
              data-testid="room-form-description"
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">Welcome Message</Label>
            <Textarea
              id="welcomeMessage"
              placeholder="Message shown when participants join"
              {...register('welcomeMessage')}
              data-testid="room-form-welcome-message"
            />
            {errors.welcomeMessage && (
              <p className="text-sm text-destructive">{errors.welcomeMessage.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxParticipants">Max Participants</Label>
            <Input
              id="maxParticipants"
              type="number"
              min={0}
              placeholder="0 for unlimited"
              {...register('maxParticipants')}
              data-testid="room-form-max-participants"
            />
            {errors.maxParticipants && (
              <p className="text-sm text-destructive">{errors.maxParticipants.message}</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="record">Record meetings</Label>
              <Switch
                id="record"
                checked={recordValue}
                onCheckedChange={(checked) => setValue('record', checked === true)}
                data-testid="room-form-record"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="autoStartRecording">Auto-start recording</Label>
              <Switch
                id="autoStartRecording"
                checked={autoStartValue}
                onCheckedChange={(checked) => setValue('autoStartRecording', checked === true)}
                data-testid="room-form-auto-start-recording"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="muteOnStart">Mute on start</Label>
              <Switch
                id="muteOnStart"
                checked={muteValue}
                onCheckedChange={(checked) => setValue('muteOnStart', checked === true)}
                data-testid="room-form-mute-on-start"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="webcamsOnlyForModerator">Webcams only for moderator</Label>
              <Switch
                id="webcamsOnlyForModerator"
                checked={webcamsValue}
                onCheckedChange={(checked) => setValue('webcamsOnlyForModerator', checked === true)}
                data-testid="room-form-webcams-only"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Meeting Layout</Label>
            <Select
              value={watch('meetingLayout')}
              onValueChange={(value) => setValue('meetingLayout', value)}
            >
              <SelectTrigger data-testid="room-form-meeting-layout">
                <SelectValue placeholder="Select layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CUSTOM_LAYOUT">Custom Layout</SelectItem>
                <SelectItem value="SMART_LAYOUT">Smart Layout</SelectItem>
                <SelectItem value="PRESENTATION_FOCUS">Presentation Focus</SelectItem>
                <SelectItem value="VIDEO_FOCUS">Video Focus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Guest Policy</Label>
            <Select
              value={watch('guestPolicy')}
              onValueChange={(value) => setValue('guestPolicy', value)}
            >
              <SelectTrigger data-testid="room-form-guest-policy">
                <SelectValue placeholder="Select policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALWAYS_ACCEPT">Always Accept</SelectItem>
                <SelectItem value="ALWAYS_DENY">Always Deny</SelectItem>
                <SelectItem value="ASK_MODERATOR">Ask Moderator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} data-testid="room-form-submit">
              {isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
