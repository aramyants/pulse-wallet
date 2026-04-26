import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette, spacing, type } from "../theme";

export function Section({
  eyebrow,
  title,
  trailing,
  children,
}: {
  eyebrow?: string;
  title?: string;
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={styles.section}>
      {eyebrow || title || trailing ? (
        <View style={styles.head}>
          <View style={styles.headLeft}>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            {title ? <Text style={styles.title}>{title}</Text> : null}
          </View>
          {trailing ? <View>{trailing}</View> : null}
        </View>
      ) : null}
      {children ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  head: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headLeft: { gap: 2 },
  eyebrow: {
    ...type.micro,
    color: palette.muted,
    textTransform: "uppercase",
  },
  title: {
    ...type.heading,
    color: palette.ink,
  },
  body: { gap: spacing.sm },
});
