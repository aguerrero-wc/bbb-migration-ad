import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PaginationMeta, Room, RoomStatus } from '@/types';
import { api } from '@/shared/lib/api';

interface RoomsListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

interface RoomsListResponse {
  data: Room[];
  meta: {
    timestamp: string;
    pagination: PaginationMeta;
  };
}

interface CreateRoomPayload {
  name: string;
  description?: string;
  welcomeMessage?: string;
  maxParticipants?: number;
  record?: boolean;
  autoStartRecording?: boolean;
  muteOnStart?: boolean;
  webcamsOnlyForModerator?: boolean;
  meetingLayout?: string;
  guestPolicy?: string;
}

type UpdateRoomPayload = Partial<CreateRoomPayload>;

interface JoinRoomResponse {
  joinUrl: string;
}

async function getRooms(params?: RoomsListParams): Promise<RoomsListResponse> {
  const response = await api.get<RoomsListResponse>('/rooms', { params });
  return response.data;
}

async function getRoom(id: string): Promise<Room> {
  const response = await api.get<{ data: Room }>(`/rooms/${id}`);
  return response.data.data;
}

async function createRoom(data: CreateRoomPayload): Promise<Room> {
  const response = await api.post<{ data: Room }>('/rooms', data);
  return response.data.data;
}

async function updateRoom(id: string, data: UpdateRoomPayload): Promise<Room> {
  const response = await api.patch<{ data: Room }>(`/rooms/${id}`, data);
  return response.data.data;
}

async function deleteRoom(id: string): Promise<void> {
  await api.delete(`/rooms/${id}`);
}

async function joinRoom(id: string): Promise<JoinRoomResponse> {
  const response = await api.post<{ data: JoinRoomResponse }>(`/rooms/${id}/join`);
  return response.data.data;
}

async function getRoomStatus(id: string): Promise<RoomStatus> {
  const response = await api.get<{ data: RoomStatus }>(`/rooms/${id}/status`);
  return response.data.data;
}

export function useRooms(params?: RoomsListParams) {
  return useQuery({
    queryKey: ['rooms', params],
    queryFn: () => getRooms(params),
  });
}

export function useRoom(id: string | undefined) {
  return useQuery({
    queryKey: ['rooms', id],
    queryFn: () => getRoom(id!),
    enabled: !!id,
  });
}

export function useRoomStatus(id: string, enabled = true) {
  return useQuery({
    queryKey: ['rooms', id, 'status'],
    queryFn: () => getRoomStatus(id),
    enabled,
    refetchInterval: enabled ? 10000 : false,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRoomPayload) => createRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoomPayload }) => updateRoom(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRoom(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useJoinRoom() {
  return useMutation({
    mutationFn: (id: string) => joinRoom(id),
  });
}
