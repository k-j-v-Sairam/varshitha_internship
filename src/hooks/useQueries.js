import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import auth from '@react-native-firebase/auth';
import * as blockService from '../services/blockService';
import * as tenantService from '../services/tenantService';
import * as noticeService from '../services/noticeService';
import * as financeService from '../services/financeService';
import * as roomService from '../services/roomService';
import * as staffService from '../services/staffService';

// ─── BLOCKS ─────────────────────────────────────────────────────────────────

export const useBlocks = () =>
  useQuery({ queryKey: ['blocks'], queryFn: blockService.getBlocks });

export const useDashboardStats = () =>
  useQuery({ queryKey: ['dashboardStats'], queryFn: blockService.getDashboardStats });

export const usePricing = () =>
  useQuery({ queryKey: ['pricing'], queryFn: blockService.getPricing });

// ─── ROOMS ───────────────────────────────────────────────────────────────────

export const useRoomsForFloor = (blockName, floorId) =>
  useQuery({
    queryKey: ['rooms', blockName, floorId],
    queryFn: () => roomService.getRoomsForFloor(blockName, floorId),
    enabled: !!blockName && !!floorId,
  });

export const useRoomDetails = (blockName, roomNumber) =>
  useQuery({
    queryKey: ['roomDetails', blockName, roomNumber],
    queryFn: () => roomService.getRoomDetails(blockName, roomNumber),
    enabled: !!blockName && !!roomNumber,
  });

// ─── TENANTS ─────────────────────────────────────────────────────────────────

export const useTenants = () =>
  useQuery({ queryKey: ['tenants'], queryFn: tenantService.getAllTenants });

export const useRoomTenants = (blockName, roomNumber) =>
  useQuery({
    queryKey: ['roomTenants', blockName, roomNumber],
    queryFn: () => tenantService.getTenantsForRoom(blockName, roomNumber),
    enabled: !!blockName && !!roomNumber,
  });

export const useTenantTransactions = (tenantId) => {
  const ownerId = auth().currentUser?.uid;
  return useQuery({
    queryKey: ['tenantTransactions', tenantId, ownerId],
    queryFn: () => tenantService.getTenantTransactions(tenantId, ownerId),
    enabled: !!tenantId && !!ownerId,
  });
};

// ─── NOTICES ─────────────────────────────────────────────────────────────────

export const useNotices = () =>
  useQuery({ queryKey: ['notices'], queryFn: noticeService.getNotices });

// ─── FINANCE ─────────────────────────────────────────────────────────────────

export const useBlockExpenses = (blockName, monthYear) =>
  useQuery({
    queryKey: ['blockExpenses', blockName, monthYear],
    queryFn: () => financeService.fetchBlockExpenses(blockName, monthYear),
    enabled: !!blockName && !!monthYear,
  });

// ─── STAFF ROLES (persisted to Firestore) ───────────────────────────────────

export const useStaffRoles = () =>
  useQuery({
    queryKey: ['staffRoles'],
    queryFn: staffService.getCustomRoles,
  });

// ─── BLOCK MUTATIONS ─────────────────────────────────────────────────────────

export const useAddBlock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blockService.addBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      queryClient.invalidateQueries({ queryKey: ['pricing'] });
    },
  });
};

export const useUpdateBlockDetails = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blockService.updateBlockDetails,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      queryClient.invalidateQueries({ queryKey: ['pricing'] });
    },
  });
};

export const useDeleteBlock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blockService.deleteBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
};

export const useAddFloor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blockService.addFloorToBlock,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['rooms', variables.blockName] });
    },
  });
};

export const useDeleteFloor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blockService.deleteFloor,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['blocks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['rooms', variables.blockName] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
};

// ─── ROOM MUTATIONS ───────────────────────────────────────────────────────────

export const useAddRoom = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: roomService.addSingleRoom,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rooms', variables.blockName, variables.floorId] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useToggleRoomAC = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: roomService.toggleRoomAC,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roomDetails', variables.blockName, variables.roomNumber] });
    },
  });
};

// ─── TENANT MUTATIONS ─────────────────────────────────────────────────────────

export const useAddTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tenantService.addTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
};

export const useRemoveTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tenantService.removeTenant,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['roomTenants', variables.blockName, variables.roomNumber] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['rooms', variables.blockName] });
    },
  });
};

export const useReassignTenant = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tenantService.reassignTenant,
    onSuccess: () => {
      // Invalidate broadly since both old and new rooms are affected
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['roomTenants'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
};

export const useUploadTenantDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tenantService.uploadTenantDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
};

export const useDeleteTenantDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tenantService.deleteTenantDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
};

/**
 * FIX 10: useDeleteTenantHistory — previously TenantProfile called Firestore directly,
 * bypassing React Query entirely. Now routed through a proper mutation so
 * the ['tenants'] cache is invalidated correctly.
 */
export const useDeleteTenantHistory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tenantService.deleteTenantHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
};

/**
 * FIX 15: useRecordRentPayment — wires up the previously dead recordRentPayment
 * function from tenantService to the UI. Invalidates tenants + dashboardStats
 * so unpaid counts update immediately.
 */
export const useRecordRentPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tenantService.recordRentPayment,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['masterFinances'] });
      // Invalidate ALL tenantTransactions queries regardless of ownerId key
      queryClient.invalidateQueries({ queryKey: ['tenantTransactions'] });
    },
  });
};

// ─── NOTICE MUTATIONS ─────────────────────────────────────────────────────────

export const useAddNotice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: noticeService.addNotice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notices'] }),
  });
};

export const useDeleteNotice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: noticeService.deleteNotice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notices'] }),
  });
};

// ─── FINANCE MUTATIONS ────────────────────────────────────────────────────────

export const useAddBlockExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeService.addBlockExpense,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['blockExpenses', variables.blockName, variables.monthYear] });
    },
  });
};

export const useSaveBatchExpenses = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeService.saveBatchExpenses,
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({
          queryKey: ['blockExpenses', variables[0].blockName, variables[0].monthYear],
        });
      }
    },
  });
};

export const useDeleteBlockExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeService.deleteBlockExpense,
    onSuccess: () => {
      // Invalidate all blockExpenses cache entries since we don't have blockName/monthYear here
      queryClient.invalidateQueries({ queryKey: ['blockExpenses'] });
    },
  });
};

// ─── STAFF ROLE MUTATIONS ─────────────────────────────────────────────────────

/**
 * FIX 11: useSaveStaffRoles — custom roles are now persisted to Firestore
 * instead of being lost on navigation.
 */
export const useSaveStaffRoles = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: staffService.saveCustomRoles,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffRoles'] });
    },
  });
};
