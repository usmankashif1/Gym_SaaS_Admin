import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii } from "@/theme/tokens";

export function Pagination({ page, total, pageSize, onPageChange }: { page: number; total: number; pageSize: number; onPageChange: (page: number) => void }) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);
  return (
    <View style={styles.row}>
      <Text style={styles.summary}>Showing {start}–{end} of {total}</Text>
      <View style={styles.controls}>
        <Pressable accessibilityLabel="Previous page" accessibilityRole="button" disabled={page === 0} onPress={() => onPageChange(page - 1)} style={[styles.button, page === 0 && styles.disabled]}>
          <ChevronLeft size={16} color={page === 0 ? "#AEB7B1" : colors.ink} />
        </Pressable>
        <Text style={styles.pageCount}>{page + 1} / {pageCount}</Text>
        <Pressable accessibilityLabel="Next page" accessibilityRole="button" disabled={page + 1 >= pageCount} onPress={() => onPageChange(page + 1)} style={[styles.button, page + 1 >= pageCount && styles.disabled]}>
          <ChevronRight size={16} color={page + 1 >= pageCount ? "#AEB7B1" : colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 55, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 17, borderTopWidth: 1, borderTopColor: colors.line },
  summary: { color: colors.muted, fontSize: 14 },
  controls: { flexDirection: "row", alignItems: "center", gap: 10 },
  button: { width: 30, height: 30, borderWidth: 1, borderColor: colors.line, borderRadius: radii.small, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.55 },
  pageCount: { color: colors.muted, fontSize: 14, minWidth: 35, textAlign: "center" },
});