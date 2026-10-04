import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { listMemberCheckIns, recordMemberCheckIn } from "@/services/checkInService";
import { createMember, deleteMember as deleteMemberRecord, listMembers, updateMember, type MemberInput, type MemberSortDirection, type MemberSortKey, type NewMemberInput } from "@/services/memberService";
import type { Member } from "@/types/domain";

export function useMembers(search: string, page: number, sortKey: MemberSortKey, sortDirection: MemberSortDirection, status: Member["status"] | "all", joinedFrom: string | null, joinedThrough: string | null, planId: string | null) {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [checkingInIds, setCheckingInIds] = useState<Set<string>>(() => new Set());
  const [checkedInState, setCheckedInState] = useState<{ key: string; ids: Set<string> }>({ key: "", ids: new Set() });
  const [today, setToday] = useState(() => new Date().toISOString().slice(0, 10));
  const queryKey = `${search}\u0000${page}\u0000${sortKey}\u0000${sortDirection}\u0000${status}\u0000${joinedFrom ?? ""}\u0000${joinedThrough ?? ""}\u0000${planId ?? ""}`;
  const checkInKey = `${queryKey}\u0000${today}`;
  const loading = Boolean(supabase && loadedKey !== queryKey);

  useEffect(() => {
    const timer = setInterval(() => {
      setToday(new Date().toISOString().slice(0, 10));
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let current = true;
    void listMembers(search, page, sortKey, sortDirection, status, joinedFrom, joinedThrough, planId)
      .then(async (result) => {
        const checkedInMemberIds = await listMemberCheckIns(result.items.map((member) => member.id), today);
        if (!current) return;
        setMembers(result.items);
        setTotal(result.total);
        setCheckedInState({ key: checkInKey, ids: new Set(checkedInMemberIds) });
        setFailure(null);
        setLoadedKey(queryKey);
      })
      .catch((caught: unknown) => {
        if (!current) return;
        setFailure({ key: queryKey, message: caught instanceof Error ? caught.message : "Could not load members." });
        setLoadedKey(queryKey);
      });
    return () => { current = false; };
  }, [checkInKey, joinedFrom, joinedThrough, page, planId, queryKey, search, sortDirection, sortKey, status, today]);

  const addMember = async (input: NewMemberInput) => {
    const member = await createMember(input);
    setMembers((current) => [member, ...current]);
    setTotal((current) => current + 1);
  };

  const saveMember = async (memberId: string, input: MemberInput) => {
    const saved = await updateMember(memberId, input);
    setMembers((current) => current.map((member) => member.id === memberId ? saved : member));
  };

  const removeMember = async (memberId: string) => {
    await deleteMemberRecord(memberId);
    setMembers((current) => current.filter((member) => member.id !== memberId));
    setTotal((current) => Math.max(0, current - 1));
  };

  const checkInMember = async (memberId: string) => {
    setCheckingInIds((current) => new Set(current).add(memberId));
    try {
      await recordMemberCheckIn(memberId);
      setCheckedInState((current) => ({
        key: checkInKey,
        ids: new Set([...(current.key === checkInKey ? current.ids : []), memberId]),
      }));
    } finally {
      setCheckingInIds((current) => {
        const next = new Set(current);
        next.delete(memberId);
        return next;
      });
    }
  };

  return {
    members,
    total,
    loading,
    error: failure?.key === queryKey ? failure.message : "",
    addMember,
    saveMember,
    removeMember,
    checkInMember,
    checkingInIds,
    checkedInIds: checkedInState.key === checkInKey ? checkedInState.ids : new Set(),
  };
}