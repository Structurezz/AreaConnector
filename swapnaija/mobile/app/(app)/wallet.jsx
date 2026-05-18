import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Animated, Platform, StatusBar, Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { WebView } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { topupWallet, getPaymentHistory, verifyPayment } from '../../src/api/payments.api';
import { getMe } from '../../src/api/auth.api';
import { useAuthStore } from '../../src/store/auth.store';
import { formatBC } from '../../src/utils/currency';
import Spinner from '../../src/components/ui/Spinner';

// ── Palette ───────────────────────────────────────────────────────────────────
const W = {
  bg:          '#F4F6F9',
  bgCard:      '#FFFFFF',
  bgSurface:   '#F0F2F5',
  bgElevated:  '#E8EBF0',
  bgInput:     '#F7F8FA',

  green:       '#00A859',
  greenDark:   '#007A40',
  greenDeep:   '#005C30',
  greenGlow:   'rgba(0,168,89,0.18)',
  greenFaint:  'rgba(0,168,89,0.08)',
  greenBorder: 'rgba(0,168,89,0.2)',
  greenLight:  '#E6F7EF',

  gold:        '#D97706',
  goldLight:   '#F59E0B',
  goldFaint:   'rgba(217,119,6,0.08)',
  goldBorder:  'rgba(217,119,6,0.2)',

  blue:        '#2563EB',
  blueLight:   '#EFF6FF',
  purple:      '#7C3AED',
  purpleLight: '#F5F3FF',
  rose:        '#E11D48',
  roseLight:   '#FFF1F2',
  teal:        '#0D9488',
  amber:       '#D97706',

  white:       '#FFFFFF',
  text:        '#0F172A',
  textSub:     '#475569',
  textMuted:   '#94A3B8',
  border:      '#E2E8F0',
  borderSoft:  '#CBD5E1',
};

// ── Data maps ─────────────────────────────────────────────────────────────────
const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

const TX_META = {
  // Wallet credits
  topup:        { label: 'Wallet Top-up',        icon: 'arrow-down-circle',  color: W.green,     credit: true  },
  refund:       { label: 'Refund',               icon: 'arrow-up-circle',    color: W.green,     credit: true  },

  // Wallet debits
  boost:        { label: 'Listing Boost',         icon: 'flash',              color: W.gold,      credit: false },
  verification: { label: 'Account Verification',  icon: 'shield-checkmark',   color: W.blue,      credit: false },
  fee:          { label: 'Platform Fee',          icon: 'receipt',            color: W.textMuted, credit: false },

  // Escrow — generic (debit: money leaves wallet into escrow)
  escrow:       { label: 'Escrow Lock',           icon: 'lock-closed',        color: W.purple,    credit: false },

  // Dispute settlements — all credits (paymentType='escrow', status='refunded', meta.type=these)
  dispute_refund:           { label: 'Escrow Refund',          icon: 'arrow-up-circle',  color: W.green, credit: true },
  dispute_compensation_won: { label: 'Dispute Won',            icon: 'trophy',           color: W.gold,  credit: true },
  dispute_topup_refunded:   { label: 'Top-up Refunded',        icon: 'arrow-up-circle',  color: W.green, credit: true },
  dispute_innocent_refund:  { label: 'Cleared — Escrow Back',  icon: 'checkmark-circle', color: W.green, credit: true },
  dispute_topup_to_winner:  { label: 'Dispute Award',          icon: 'trophy',           color: W.gold,  credit: true },
  dispute_topup_to_innocent:{ label: 'Dispute — Top-up Award', icon: 'checkmark-circle', color: W.green, credit: true },

  // Counsel fees
  counsel_fee:              { label: 'Counsel Fee',            icon: 'briefcase',        color: W.textMuted, credit: false },
  counsel_fee_received:     { label: 'Counsel Payment',        icon: 'briefcase',        color: W.green,     credit: true  },
};

function getTxMeta(tx) {
  const metaType = tx.meta?.type || '';
  const baseType = tx.paymentType || tx.type || '';

  // meta.type is always more specific — prefer it when we have a known mapping
  const key = (metaType && TX_META[metaType]) ? metaType : baseType;
  const found = TX_META[key];
  if (found) return found;

  // Fallback: escrow with status='refunded' is always money coming back
  if (baseType === 'escrow' && tx.status === 'refunded') {
    return { label: 'Escrow Refund', icon: 'arrow-up-circle', color: W.green, credit: true };
  }

  return { label: key || 'Transaction', icon: 'ellipse-outline', color: W.textMuted, credit: false };
}

// ── Group transactions by date ─────────────────────────────────────────────────
function groupByDate(txs) {
  const groups = {};
  for (const tx of txs) {
    const d = tx.createdAt ? new Date(tx.createdAt) : new Date();
    let key;
    if (isToday(d))     key = 'Today';
    else if (isYesterday(d)) key = 'Yesterday';
    else key = format(d, 'MMM d, yyyy');
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  }
  return Object.entries(groups);
}

// ── Animated balance ──────────────────────────────────────────────────────────
function BalanceCard({ balance, userId }) {
  const [hidden, setHidden] = useState(false);
  const fadeAnim  = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.04, duration: 2000, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 2000, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1, duration: 2500, useNativeDriver: false }),
      Animated.timing(glowAnim, { toValue: 0, duration: 2500, useNativeDriver: false }),
    ])).start();
  }, []);

  const toggleHide = () => {
    Animated.timing(fadeAnim, {
      toValue: hidden ? 1 : 0, duration: 200, useNativeDriver: true,
    }).start(() => setHidden(!hidden));
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 200, useNativeDriver: true,
    }).start();
  };

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1], outputRange: ['rgba(0,168,89,0.25)', 'rgba(0,168,89,0.55)'],
  });

  const walletId = userId
    ? `SW-${userId.toString().slice(-4).toUpperCase()}-${userId.toString().slice(-8, -4).toUpperCase()}`
    : 'SW-XXXX-XXXX';

  const bc = (balance ?? 0) / 100;

  const handleCopy = () => {
    Clipboard.setStringAsync(walletId);
    Toast.show({ type: 'success', text1: 'Wallet ID copied' });
  };

  return (
    <Animated.View style={[s.card, { borderColor }]}>
      {/* Corner glow blobs */}
      <View style={s.cardGlowTR} />
      <View style={s.cardGlowBL} />

      {/* Header row */}
      <View style={s.cardHeaderRow}>
        <View style={s.cardBrand}>
          <View style={s.greenDot} />
          <Text style={s.cardBrandText}>SWAPNAIJA WALLET</Text>
        </View>
        <TouchableOpacity style={s.eyeBtn} onPress={toggleHide} activeOpacity={0.7}>
          <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      {/* Balance */}
      <Text style={s.balLabel}>Total Balance</Text>
      <Animated.View style={{ opacity: fadeAnim }}>
        {hidden ? (
          <View style={s.hiddenRow}>
            {[...Array(5)].map((_, i) => (
              <View key={i} style={s.hiddenDot} />
            ))}
          </View>
        ) : (
          <View style={s.balRow}>
            <Text style={s.balAmount}>
              {bc.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={s.balCurrency}>BC</Text>
          </View>
        )}
      </Animated.View>
      <Text style={s.balBC}>1 BC = ₦1 · Secured by Paystack</Text>

      {/* Divider */}
      <View style={s.cardDivider} />

      {/* Footer */}
      <View style={s.cardFooterRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.walletIdLabel}>Wallet ID</Text>
          <Text style={s.walletId}>{walletId}</Text>
        </View>
        <TouchableOpacity style={s.copyBtn} onPress={handleCopy} activeOpacity={0.7}>
          <Ionicons name="copy-outline" size={12} color={W.green} />
          <Text style={s.copyText}>Copy</Text>
        </TouchableOpacity>
        <View style={s.paystackBadge}>
          <Ionicons name="shield-checkmark" size={11} color={W.green} />
          <Text style={s.paystackText}>Paystack</Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Quick action button ───────────────────────────────────────────────────────
function QuickAction({ icon, label, color = W.green, bg, onPress, badge }) {
  return (
    <TouchableOpacity style={s.quickAction} onPress={onPress} activeOpacity={0.75}>
      <View style={[s.quickIconWrap, { backgroundColor: bg || `${color}18`, borderColor: `${color}30` }]}>
        {badge && <View style={s.quickBadge}><Text style={s.quickBadgeText}>{badge}</Text></View>}
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={s.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Single transaction row ────────────────────────────────────────────────────
function TxRow({ tx }) {
  const meta  = getTxMeta(tx);
  const kobo  = tx.amountKobo ?? 0;
  const bc    = kobo / 100;
  const time  = tx.createdAt ? format(new Date(tx.createdAt), 'h:mm a') : '';
  const status = tx.status || 'success';
  const statusColor = status === 'success' || status === 'refunded' ? W.green
                    : status === 'pending' ? W.gold
                    : W.rose;

  return (
    <View style={s.txRow}>
      <View style={[s.txIconBox, { backgroundColor: `${meta.color}14`, borderColor: `${meta.color}25` }]}>
        <Ionicons name={meta.icon} size={20} color={meta.color} />
      </View>
      <View style={s.txBody}>
        <Text style={s.txLabel} numberOfLines={1}>{meta.label}</Text>
        <View style={s.txSubRow}>
          <View style={[s.statusPill, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}30` }]}>
            <Text style={[s.statusText, { color: statusColor }]}>{status}</Text>
          </View>
          <Text style={s.txTime}>{time}</Text>
        </View>
      </View>
      <Text style={[s.txAmount, { color: meta.credit ? W.green : W.rose }]}>
        {meta.credit ? '+' : '−'}{bc.toLocaleString('en-NG', { minimumFractionDigits: 2 })} BC
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function WalletScreen() {
  const { user, updateUser } = useAuthStore();
  const router       = useRouter();
  const queryClient  = useQueryClient();
  const { returnTo } = useLocalSearchParams();
  const [amount, setAmount]         = useState('');
  const [paystackUrl, setPaystackUrl] = useState(null);
  const [showFund, setShowFund]     = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const { data: history, isLoading, isError, refetch } = useQuery({
    queryKey: ['payment-history'],
    queryFn: () => getPaymentHistory({ limit: 50 }),
    retry: 1,
  });

  const initMutation = useMutation({
    mutationFn: (amt) => topupWallet({ amountKobo: amt * 100, email: user?.email }),
    onSuccess: (data) => {
      const url = data?.authorizationUrl || data?.authorization_url;
      if (url) {
        setShowFund(false);
        setTimeout(() => setPaystackUrl(url), 300);
      }
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Could not initialise payment', text2: err?.response?.data?.error || '' });
    },
  });

  const handleTopup = useCallback(() => {
    const amt = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (!amt || amt < 100) {
      Toast.show({ type: 'error', text1: 'Minimum top-up is 100 BC' });
      return;
    }
    initMutation.mutate(amt);
  }, [amount]);

  const handleWebViewNav = useCallback(async (navState) => {
    const url = navState.url || '';
    if (url.includes('reference=') || url.includes('/callback') || url.includes('trxref=')) {
      const match = url.match(/reference=([^&]+)/) || url.match(/trxref=([^&]+)/);
      const ref = match?.[1];
      setPaystackUrl(null);
      if (ref) {
        try {
          const result = await verifyPayment(ref);
          if (result?.status === 'success' || result?.paid) {
            const me = await getMe();
            updateUser({ walletBalance: me.walletBalance });
            queryClient.invalidateQueries({ queryKey: ['payment-history'] });
            Toast.show({ type: 'success', text1: '🎉 Top-up successful!', text2: formatBC(result.amountKobo || parseInt(amount) * 100) });
            setAmount('');
            setShowFund(false);
            if (returnTo) {
              setTimeout(() => router.replace(returnTo), 400);
            }
          } else {
            Toast.show({ type: 'error', text1: 'Payment not confirmed' });
          }
        } catch {
          Toast.show({ type: 'info', text1: 'Payment processed', text2: 'Balance will update shortly' });
        }
      }
    }
  }, [amount]);

  const transactions = history?.payments ?? [];
  const serverBalance = history?.walletBalance ?? user?.walletBalance ?? 0;
  const grouped = groupByDate(transactions);

  const translateY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={W.white} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={W.text} />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>My Wallet</Text>
          <Text style={s.headerSub}>SwapNaija Finance</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => refetch()} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={20} color={W.textSub} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <Animated.View style={{ opacity: slideAnim, transform: [{ translateY }] }}>

          {/* Balance card */}
          <BalanceCard balance={serverBalance} userId={user?.id} />

          {/* Quick actions */}
          <View style={s.quickRow}>
            <QuickAction
              icon="add-circle"
              label="Add Money"
              color={W.green}
              onPress={() => setShowFund(true)}
            />
            <QuickAction
              icon="swap-horizontal"
              label="My Swaps"
              color={W.blue}
              onPress={() => router.push('/swaps')}
            />
            <QuickAction
              icon="lock-closed"
              label="Escrow"
              color={W.purple}
              onPress={() => router.push('/swaps')}
            />
            <QuickAction
              icon="help-circle"
              label="Support"
              color={W.gold}
              onPress={() => Toast.show({ type: 'info', text1: 'Support coming soon' })}
            />
          </View>

          {/* Stats strip */}
          <View style={s.statsRow}>
            <View style={[s.statCard, { borderColor: `${W.green}30` }]}>
              <Ionicons name="arrow-up-circle" size={18} color={W.green} />
              <Text style={s.statLabel}>Total In</Text>
              <Text style={[s.statVal, { color: W.green }]}>
                {(transactions
                  .filter(t => getTxMeta(t).credit && t.status !== 'failed' && t.status !== 'pending')
                  .reduce((a, t) => a + (t.amountKobo ?? 0), 0) / 100
                ).toLocaleString('en-NG')} BC
              </Text>
            </View>
            <View style={[s.statCard, { borderColor: `${W.rose}25` }]}>
              <Ionicons name="arrow-down-circle" size={18} color={W.rose} />
              <Text style={s.statLabel}>Total Out</Text>
              <Text style={[s.statVal, { color: W.rose }]}>
                {(transactions
                  .filter(t => !getTxMeta(t).credit && t.status !== 'failed' && t.status !== 'pending')
                  .reduce((a, t) => a + (t.amountKobo ?? 0), 0) / 100
                ).toLocaleString('en-NG')} BC
              </Text>
            </View>
            <View style={[s.statCard, { borderColor: `${W.blue}25` }]}>
              <Ionicons name="receipt" size={18} color={W.blue} />
              <Text style={s.statLabel}>Transactions</Text>
              <Text style={[s.statVal, { color: W.blue }]}>{transactions.length}</Text>
            </View>
          </View>

          {/* Transaction history */}
          <View style={s.historySection}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Transaction History</Text>
              <View style={s.liveIndicator}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>LIVE</Text>
              </View>
            </View>

            {isLoading ? (
              <View style={s.centered}>
                <Spinner size="small" />
                <Text style={s.loadingText}>Loading transactions…</Text>
              </View>
            ) : isError ? (
              <View style={s.centered}>
                <Ionicons name="cloud-offline-outline" size={36} color={W.textMuted} />
                <Text style={s.emptyTitle}>Could not load</Text>
                <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
                  <Text style={s.retryText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : transactions.length === 0 ? (
              <View style={s.centered}>
                <View style={s.emptyIcon}>
                  <Ionicons name="receipt-outline" size={32} color={W.textMuted} />
                </View>
                <Text style={s.emptyTitle}>No transactions yet</Text>
                <Text style={s.emptySub}>Fund your wallet to get started</Text>
                <TouchableOpacity style={s.emptyAction} onPress={() => setShowFund(true)}>
                  <Ionicons name="add" size={14} color={W.green} />
                  <Text style={s.emptyActionText}>Add Money</Text>
                </TouchableOpacity>
              </View>
            ) : (
              grouped.map(([dateLabel, txs]) => (
                <View key={dateLabel} style={s.txGroup}>
                  <Text style={s.txGroupLabel}>{dateLabel}</Text>
                  <View style={s.txGroupCard}>
                    {txs.map((tx, i) => (
                      <View key={tx.id || tx._id || i}>
                        <TxRow tx={tx} />
                        {i < txs.length - 1 && <View style={s.txDivider} />}
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>

      {/* ── Fund Wallet Bottom Sheet ─────────────────────────────────────────── */}
      <Modal visible={showFund} animationType="slide" transparent onRequestClose={() => setShowFund(false)}>
        <Pressable style={s.overlay} onPress={() => setShowFund(false)} />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />

          <View style={s.sheetHeader}>
            <View>
              <Text style={s.sheetTitle}>Add Money</Text>
              <Text style={s.sheetSub}>Fund your SwapNaija wallet</Text>
            </View>
            <TouchableOpacity style={s.sheetClose} onPress={() => setShowFund(false)}>
              <Ionicons name="close" size={20} color={W.textSub} />
            </TouchableOpacity>
          </View>

          {/* Amount display */}
          <View style={s.amountDisplay}>
            <Text style={s.amountValue}>
              {amount ? parseInt(amount).toLocaleString('en-NG') : '0'}
            </Text>
            <Text style={s.amountCurrency}>BC</Text>
          </View>

          {/* Preset pills */}
          <View style={s.presets}>
            {PRESET_AMOUNTS.map((preset) => {
              const active = parseInt(amount) === preset;
              return (
                <TouchableOpacity
                  key={preset}
                  style={[s.preset, active && s.presetActive]}
                  onPress={() => setAmount(String(preset))}
                  activeOpacity={0.75}
                >
                  <Text style={[s.presetText, active && s.presetTextActive]}>
                    {preset >= 1000 ? `${preset / 1000}K BC` : `${preset} BC`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom input */}
          <View style={s.inputWrap}>
            <Text style={s.inputPrefix}>BC</Text>
            <TextInput
              style={s.input}
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^0-9]/g, ''))}
              placeholder="Enter custom amount"
              placeholderTextColor={W.textMuted}
              keyboardType="number-pad"
              maxLength={8}
            />
            {amount.length > 0 && (
              <TouchableOpacity onPress={() => setAmount('')}>
                <Ionicons name="close-circle" size={18} color={W.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {amount && parseInt(amount) >= 100 && (
            <View style={s.feeNote}>
              <Ionicons name="information-circle-outline" size={13} color={W.textMuted} />
              <Text style={s.feeNoteText}>
                You will receive {parseInt(amount).toLocaleString('en-NG')} BC · 1 BC = ₦1
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.fundBtn, (!amount || parseInt(amount) < 100 || initMutation.isPending) && s.fundBtnOff]}
            onPress={handleTopup}
            disabled={!amount || parseInt(amount) < 100 || initMutation.isPending}
            activeOpacity={0.85}
          >
            {initMutation.isPending ? (
              <Spinner size="small" color={W.white} />
            ) : (
              <>
                <Ionicons name="card" size={18} color={W.white} />
                <Text style={s.fundBtnText}>Fund Wallet via Paystack</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={s.secureNote}>
            <Ionicons name="lock-closed" size={12} color={W.textMuted} />
            <Text style={s.secureNoteText}>256-bit encrypted · Paystack certified</Text>
          </View>
        </View>
      </Modal>

      {/* ── Paystack WebView ─────────────────────────────────────────────────── */}
      <Modal visible={!!paystackUrl} animationType="slide">
        <View style={s.webviewContainer}>
          <View style={s.webviewHeader}>
            <TouchableOpacity style={s.webviewBack} onPress={() => setPaystackUrl(null)} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={W.text} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={s.webviewTitle}>Secure Payment</Text>
              <View style={s.webviewBadge}>
                <Ionicons name="shield-checkmark" size={10} color={W.green} />
                <Text style={s.webviewBadgeText}>Paystack</Text>
              </View>
            </View>
            <View style={{ width: 44 }} />
          </View>
          {paystackUrl && (
            <WebView
              source={{ uri: paystackUrl }}
              onNavigationStateChange={handleWebViewNav}
              style={{ flex: 1 }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: W.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingHorizontal: 16, paddingBottom: 14,
    backgroundColor: W.white,
    borderBottomWidth: 1, borderBottomColor: W.border,
  },
  backBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, backgroundColor: W.bgSurface,
    borderWidth: 1, borderColor: W.border,
  },
  refreshBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 12, backgroundColor: W.bgSurface,
    borderWidth: 1, borderColor: W.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: W.text, textAlign: 'center' },
  headerSub: { fontSize: 10, color: W.textMuted, textAlign: 'center', marginTop: 1, letterSpacing: 0.5 },

  content: { padding: 16, gap: 16 },

  // Balance card — green on white
  card: {
    backgroundColor: W.green,
    borderRadius: 24, borderWidth: 1.5,
    padding: 22, overflow: 'hidden',
    shadowColor: W.greenDark, shadowOpacity: 0.25, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  cardGlowTR: {
    position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  cardGlowBL: {
    position: 'absolute', bottom: -30, left: -20,
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardBrand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: W.white },
  cardBrandText: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.9)', letterSpacing: 2 },
  eyeBtn: {
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10,
  },

  balLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500', marginBottom: 6 },
  balRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  balCurrency: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginBottom: 5 },
  balAmount: { fontSize: 42, fontWeight: '800', color: W.white, letterSpacing: -1 },
  balBC: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6, marginBottom: 18 },

  hiddenRow: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 50, paddingTop: 8 },
  hiddenDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.3)' },

  cardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 14 },

  cardFooterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  walletIdLabel: { fontSize: 9, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  walletId: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '700' },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  copyText: { fontSize: 11, color: W.white, fontWeight: '700' },
  paystackBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  paystackText: { fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },

  // Quick actions
  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickAction: { alignItems: 'center', gap: 7, flex: 1 },
  quickIconWrap: {
    width: 58, height: 58, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: W.white, borderWidth: 1, borderColor: W.border,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  quickLabel: { fontSize: 11, color: W.textSub, fontWeight: '600', textAlign: 'center' },
  quickBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: W.rose, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 1 },
  quickBadgeText: { fontSize: 9, color: W.white, fontWeight: '700' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: W.white, borderRadius: 16,
    borderWidth: 1, borderColor: W.border,
    padding: 14, alignItems: 'flex-start', gap: 5,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  statLabel: { fontSize: 11, color: W.textMuted, fontWeight: '500', marginTop: 2 },
  statVal: { fontSize: 14, fontWeight: '800' },

  // History
  historySection: { gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: W.text },
  liveIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF1F2', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1, borderColor: '#FECDD3',
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: W.rose },
  liveText: { fontSize: 9, fontWeight: '800', color: W.rose, letterSpacing: 1 },

  txGroup: { gap: 8 },
  txGroupLabel: {
    fontSize: 11, color: W.textMuted, fontWeight: '700',
    letterSpacing: 0.6, textTransform: 'uppercase', paddingLeft: 2,
  },
  txGroupCard: {
    backgroundColor: W.white, borderRadius: 18,
    borderWidth: 1, borderColor: W.border, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },

  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  txDivider: { height: 1, backgroundColor: W.border, marginHorizontal: 14 },
  txIconBox: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, flexShrink: 0,
  },
  txBody: { flex: 1, gap: 5 },
  txLabel: { fontSize: 14, fontWeight: '600', color: W.text },
  txSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  txTime: { fontSize: 11, color: W.textMuted },
  txAmount: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },

  centered: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  loadingText: { fontSize: 13, color: W.textMuted },
  emptyIcon: {
    width: 70, height: 70, borderRadius: 22, backgroundColor: W.bgSurface,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: W.border,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: W.text },
  emptySub: { fontSize: 13, color: W.textMuted },
  emptyAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: W.greenLight, borderRadius: 12,
    paddingHorizontal: 18, paddingVertical: 9,
    borderWidth: 1, borderColor: W.greenBorder, marginTop: 4,
  },
  emptyActionText: { fontSize: 14, color: W.green, fontWeight: '700' },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 8,
    backgroundColor: W.bgSurface, borderRadius: 12,
    borderWidth: 1, borderColor: W.border,
  },
  retryText: { fontSize: 13, color: W.text, fontWeight: '600' },

  // Fund sheet
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)' },
  sheet: {
    backgroundColor: W.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1, borderColor: W.border,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 }, elevation: 20,
  },
  sheetHandle: { width: 36, height: 4, backgroundColor: W.bgElevated, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: W.text },
  sheetSub: { fontSize: 13, color: W.textMuted, marginTop: 3 },
  sheetClose: {
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center',
    backgroundColor: W.bgSurface, borderRadius: 10,
    borderWidth: 1, borderColor: W.border,
  },

  amountDisplay: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 4, marginBottom: 24 },
  amountCurrency: { fontSize: 18, fontWeight: '700', color: W.textMuted, marginBottom: 8 },
  amountValue: { fontSize: 52, fontWeight: '800', color: W.text, letterSpacing: -2 },

  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  preset: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12,
    backgroundColor: W.bgSurface, borderWidth: 1.5, borderColor: W.border,
  },
  presetActive: { backgroundColor: W.greenLight, borderColor: W.green },
  presetText: { fontSize: 13, fontWeight: '700', color: W.textSub },
  presetTextActive: { color: W.green },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: W.bgInput, borderRadius: 16, borderWidth: 1.5, borderColor: W.border,
    paddingHorizontal: 16, marginBottom: 12,
  },
  inputPrefix: { fontSize: 20, fontWeight: '700', color: W.textMuted },
  input: { flex: 1, paddingVertical: 15, fontSize: 20, color: W.text, fontWeight: '700' },

  feeNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, paddingHorizontal: 4 },
  feeNoteText: { flex: 1, fontSize: 12, color: W.textMuted },

  fundBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: W.green, borderRadius: 18, paddingVertical: 16,
    shadowColor: W.green, shadowOpacity: 0.3, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 8,
  },
  fundBtnOff: { backgroundColor: W.bgElevated, shadowOpacity: 0 },
  fundBtnText: { fontSize: 16, fontWeight: '800', color: W.white },

  secureNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 14 },
  secureNoteText: { fontSize: 11, color: W.textMuted },

  // WebView
  webviewContainer: { flex: 1, backgroundColor: W.white },
  webviewHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingHorizontal: 12, paddingBottom: 14,
    backgroundColor: W.white, borderBottomWidth: 1, borderBottomColor: W.border,
  },
  webviewBack: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: W.bgSurface, borderRadius: 12,
    borderWidth: 1, borderColor: W.border,
  },
  webviewTitle: { fontSize: 15, fontWeight: '700', color: W.text },
  webviewBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  webviewBadgeText: { fontSize: 11, color: W.green, fontWeight: '600' },
});
