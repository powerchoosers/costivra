import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const signals = [
  ['Savings at risk', '$2.47M', 'cash-outline', '#5067ff'],
  ['Contracts renewing (90d)', '$4.12M', 'time-outline', '#80dabb'],
  ['Unrealized savings', '$1.86M', 'pulse-outline', '#d4ff5a'],
] as const;

export default function CommandCenterScreen() {
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.topbar}><View style={styles.brandRow}><View style={styles.markTile}><Image source={require('@/assets/images/costivra-circuit-mark.png')} style={styles.mark} /></View><View><Text style={styles.org}>Northstar Hospitality</Text><Text style={styles.meta}>Command center</Text></View></View><Pressable accessibilityLabel="Notifications" style={styles.iconButton}><Ionicons name="notifications-outline" size={21} color="#f7f8fc" /></Pressable></View>
    <Text style={styles.greeting}>Good morning</Text><Text style={styles.subhead}>Focus on what needs a decision.</Text>
    <Text style={styles.sectionLabel}>Key signals</Text><View style={styles.signalCard}>{signals.map(([label, value, icon, color]) => <Pressable style={styles.signalRow} key={label}><View style={[styles.signalIcon,{backgroundColor: color}]}><Ionicons name={icon} size={18} color="#080b14" /></View><View style={styles.signalCopy}><Text style={styles.signalLabel}>{label}</Text><Text style={styles.signalValue}>{value}</Text></View><Ionicons name="chevron-forward" size={18} color="#9ba7ba" /></Pressable>)}</View>
    <Text style={styles.sectionLabel}>Priority opportunity</Text><Pressable style={styles.opportunity}><View style={styles.impact}><Text style={styles.impactText}>HIGH IMPACT</Text></View><Text style={styles.caseTitle}>Verizon price increase</Text><Text style={styles.caseMeta}>Business internet · renewal in 59 days</Text><View style={styles.caseFacts}><View><Text style={styles.factLabel}>Annual impact</Text><Text style={styles.factValue}>$18,750</Text></View><View><Text style={styles.factLabel}>Evidence</Text><Text style={styles.factValue}>7 sources</Text></View><Ionicons name="arrow-forward" size={20} color="#d4ff5a" /></View></Pressable>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080b14' }, content: { padding: 20, paddingBottom: 28 },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, markTile: { width: 43, height: 43, borderRadius: 10, backgroundColor: '#f7f8fc', padding: 4 }, mark: { width: '100%', height: '100%', resizeMode: 'contain' }, org: { color: '#f7f8fc', fontSize: 15, fontWeight: '700' }, meta: { color: '#9ba7ba', fontSize: 12, marginTop: 2 }, iconButton: { width: 43, height: 43, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#263144', borderRadius: 10 },
  greeting: { color: '#f7f8fc', fontFamily: 'Georgia', fontSize: 34, marginTop: 34 }, subhead: { color: '#aeb9ca', fontSize: 15, marginTop: 7 }, sectionLabel: { color: '#8996aa', fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginTop: 32, marginBottom: 10, textTransform: 'uppercase' },
  signalCard: { borderColor: '#263144', borderWidth: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: '#0d1523' }, signalRow: { minHeight: 76, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomColor: '#263144', borderBottomWidth: 1 }, signalIcon: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, signalCopy: { flex: 1 }, signalLabel: { color: '#aeb9ca', fontSize: 13 }, signalValue: { color: '#f7f8fc', fontFamily: 'Georgia', fontSize: 22, marginTop: 2 },
  opportunity: { borderColor: '#2e3a50', borderWidth: 1, borderRadius: 14, padding: 18, backgroundColor: '#101a2b' }, impact: { alignSelf: 'flex-start', backgroundColor: '#d4ff5a', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 5 }, impactText: { color: '#080b14', fontSize: 10, fontWeight: '900', letterSpacing: .8 }, caseTitle: { color: '#f7f8fc', fontFamily: 'Georgia', fontSize: 25, marginTop: 17 }, caseMeta: { color: '#aeb9ca', fontSize: 13, marginTop: 5 }, caseFacts: { flexDirection: 'row', alignItems: 'center', gap: 30, borderTopColor: '#2e3a50', borderTopWidth: 1, marginTop: 20, paddingTop: 15 }, factLabel: { color: '#8996aa', fontSize: 11 }, factValue: { color: '#d4ff5a', fontSize: 18, fontWeight: '700', marginTop: 4 },
});
