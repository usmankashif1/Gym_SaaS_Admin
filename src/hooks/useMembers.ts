import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { recordMemberCheckIn } from "@/services/checkInService";
import { createMember, listMembers, updateMember, type MemberInput } from "@/services/memberService";
import type { Member } from "@/types/domain";

export function useMembers(search: string, page: number) {
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [checkingInIds, setCheckingInIds] = useState<Set<string>>(() => new Set());
  const [checkedInIds, setCheckedInIds] = useState<Set<string>>(() => new Set());
  const queryKey = `${search}\u0000${page}`;
  const loading = Boolean(supabase && loadedKey !== queryKey);

  useEffect(() => {
    if (!supabase) return;
    let current = true;
    void listMembers(search, page)
      .then((result) => {
        if (!current) return;
        setMembers(result.items);
        setTotal(result.total);
        setFailure(null);
        setLoadedKey(queryKey);
      })
      .catch((caught: unknown) => {
        if (!current) return;
        setFailure({ key: queryKey, message: caught instanceof Error ? caught.message : "Could not load members." });
        setLoadedKey(queryKey);
      });
    return () => { current = false; };
  }, [page, queryKey, search]);

  const addMember = async (input: MemberInput) => {
    const added = await createMember(input);
    setMembers((current) => [added, ...current]);
    setTotal((current) => current + 1);
  };

  const saveMember = async (memberId: string, input: MemberInput) => {
    const saved = await updateMember(memberId, input);
    setMembers((current) => current.map((member) => member.id === memberId ? saved : member));
  };

  const checkInMember = async (memberId: string) => {
    setCheckingInIds((current) => new Set(current).add(memberId));
    try {
      await recordMemberCheckIn(memberId);
      setCheckedInIds((current) => new Set(current).add(memberId));
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
    checkInMember,
    checkingInIds,
    checkedInIds,
  };
}