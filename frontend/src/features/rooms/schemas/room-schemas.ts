import { z } from 'zod';

export const createRoomSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name is too long'),
  description: z.string().max(1000, 'Description is too long').optional().or(z.literal('')),
  welcomeMessage: z
    .string()
    .max(2000, 'Welcome message is too long')
    .optional()
    .or(z.literal('')),
  maxParticipants: z.coerce
    .number()
    .int()
    .min(0, 'Must be 0 or more')
    .optional()
    .or(z.literal('')),
  record: z.boolean().optional(),
  autoStartRecording: z.boolean().optional(),
  muteOnStart: z.boolean().optional(),
  webcamsOnlyForModerator: z.boolean().optional(),
  meetingLayout: z.string().optional(),
  guestPolicy: z.string().optional(),
});

export type CreateRoomFormData = z.infer<typeof createRoomSchema>;

export const updateRoomSchema = createRoomSchema.partial();

export type UpdateRoomFormData = z.infer<typeof updateRoomSchema>;
