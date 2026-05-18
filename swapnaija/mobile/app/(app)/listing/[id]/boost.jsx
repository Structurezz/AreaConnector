import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { getListing } from '../../../../src/api/listings.api';
import { getBoostPlans, initiateBoost } from '../../../../src/api/payments.api';
import { getMe } from '../../../../src/api/auth.api';
import { useAuthStore } from '../../../../src/store/auth.store';
import { COLORS, formatBC, getListingPlaceholder } from '../../../../src/utils/currency';
import Button from '../../../../src/components/ui/Button';
import Spinner from '../../../../src/components/ui/Spinner';

const FALLBACK_PLANS = [
  { id: '7d',  amountKobo: 50000,  days: 7,  label: '7 Days' },
  { id: '30d', amountKobo: 150000, days: 30, label: '30 Days' },
];

const BENEFITS = [
  { icon: 'trending-up',   label: '10× more visibility',        desc: 'Boosted listings appear at the top of search results.' },
  { icon: 'eye',           label: 'Featured on Home page',       desc: 'Your listing shows in the Featured section seen by all users.' },
  { icon: 'search',        label: 'Priority in category feeds',  desc: 'Ranked first when people browse your category.' },
];

export default function BoostScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState('7d');

  const { data: listing, isLoading: listingLoading } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => getListing(id),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['boost-plans'],
    queryFn: getBoostPlans,
    staleTime: Infinity,
  });

  const activePlans  = plans.length ? plans : FALLBACK_PLANS;
  const currentPlan  = activePlans.find(p => p.id === selectedPlan) || activePlans[0];
  const walletBalance = user?.walletBalance ?? 0;
  const canAfford    = walletBalance >= (currentPlan?.amountKobo ?? 0);

  const isBoosted = listing?.isBoosted &&
    listing?.boostExpires &&
    new Date(listing.boostExpires) > new Date();

  const boostMutation = useMutation({
    mutationFn: () => initiateBoost(id, { plan: selectedPlan }),
    onSuccess: async () => {
      try {
        const me = await getMe();
        updateUser({ walletBalance: me.walletBalance });
      } catch (_) {}
      Toast.show({ type: 'success', text1: '🚀 Listing Boosted!', text2: 'Your listing is now featured.' });
      router.back();
    },
    onError: (err) => Toast.show({ type: 'error', text1: err?.response?.data?.error || 'Boost failed' }),
  });

  if (listingLoading) return <Spinner full />;
  if (!listing) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Listing not found</Text>
    </View>
  );

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Boost Listing</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Listing preview */}
        <View style={styles.listingCard}>
          <Image
            source={{ uri: listing.images?.[0] || getListingPlaceholder(listing) }}
            style={styles.listingImg}
            resizeMode="cover"
          />
          <View style={styles.listingInfo}>
            <Text style={styles.listingTitle} numberOfLines={2}>{listing.title}</Text>
            {listing.estimatedValue ? (
              <Text style={styles.listingValue}>₦{listing.estimatedValue.toLocaleString()}</Text>
            ) : null}
            {isBoosted && (
              <View style={styles.boostedBadge}>
                <Ionicons name="flash" size={11} color={COLORS.accent} />
                <Text style={styles.boostedText}>
                  Boosted until {new Date(listing.boostExpires).toLocaleDateString('en-NG')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {isBoosted ? (
          /* ── Already boosted state ── */
          <View style={styles.alreadyBoosted}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.accent} />
            <Text style={styles.alreadyTitle}>Already Boosted!</Text>
            <Text style={styles.alreadyDesc}>
              This listing is boosted until{' '}
              {new Date(listing.boostExpires).toLocaleDateString('en-NG', { day: 'numeric', month: 'long' })}.
            </Text>
          </View>
        ) : (
          <>
            {/* ── Hero banner ── */}
            <View style={styles.heroBanner}>
              <View style={styles.heroTop}>
                <View style={styles.heroIconWrap}>
                  <Ionicons name="flash" size={22} color="#fff" />
                </View>
                <View>
                  <Text style={styles.heroTitle}>Boost This Listing</Text>
                  <Text style={styles.heroSub}>Get seen by more swappers</Text>
                </View>
              </View>
              <Text style={styles.heroBody}>
                Boosted listings get up to{' '}
                <Text style={{ fontWeight: '800' }}>10× more views</Text>
                {' '}and appear at the top of search results and the Featured section on the Home page.
              </Text>
            </View>

            {/* ── Benefits ── */}
            <View style={styles.benefits}>
              {BENEFITS.map((b) => (
                <View key={b.label} style={styles.benefitRow}>
                  <View style={styles.benefitIcon}>
                    <Ionicons name={b.icon} size={16} color={COLORS.accent} />
                  </View>
                  <View style={styles.benefitText}>
                    <Text style={styles.benefitLabel}>{b.label}</Text>
                    <Text style={styles.benefitDesc}>{b.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* ── Plan selection ── */}
            <Text style={styles.planHeading}>Choose a plan</Text>
            {activePlans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planCard, isSelected && styles.planCardActive]}
                  onPress={() => setSelectedPlan(plan.id)}
                  activeOpacity={0.8}
                >
                  <View>
                    <Text style={[styles.planDays, isSelected && styles.planDaysActive]}>
                      {plan.days} Days
                    </Text>
                    <Text style={styles.planSubtitle}>Top placement for {plan.days} days</Text>
                  </View>
                  <View style={styles.planRight}>
                    <Text style={[styles.planPrice, isSelected && styles.planPriceActive]}>
                      ₦{(plan.amountKobo / 100).toLocaleString()}
                    </Text>
                    <Text style={styles.planFrom}>from wallet</Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={styles.planCheck} />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* ── Wallet balance check ── */}
            <View style={[styles.balanceCard, canAfford ? styles.balanceOk : styles.balanceLow]}>
              <Ionicons
                name="wallet-outline"
                size={18}
                color={canAfford ? '#065F46' : '#991B1B'}
              />
              <View style={styles.balanceInfo}>
                <Text style={[styles.balanceStatus, canAfford ? styles.balanceStatusOk : styles.balanceStatusLow]}>
                  {canAfford ? 'Sufficient balance' : 'Insufficient balance'}
                </Text>
                <Text style={styles.balanceLine}>
                  Wallet: {formatBC(walletBalance)} · Cost: {formatBC(currentPlan?.amountKobo ?? 0)}
                </Text>
              </View>
              {!canAfford && (
                <TouchableOpacity
                  style={styles.topUpBtn}
                  onPress={() => router.push(`/wallet?returnTo=/listing/${id}/boost`)}
                >
                  <Text style={styles.topUpBtnText}>Top Up</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Lock note ── */}
            <View style={styles.lockNote}>
              <Ionicons name="lock-closed-outline" size={12} color={COLORS.textLight} />
              <Text style={styles.lockText}>Deducted instantly from your SwapNaija wallet balance.</Text>
            </View>

            {/* ── CTA ── */}
            {canAfford ? (
              <Button
                title={`Boost for ${currentPlan?.days} Days — ₦${((currentPlan?.amountKobo ?? 0) / 100).toLocaleString()}`}
                onPress={() => boostMutation.mutate()}
                loading={boostMutation.isPending}
                icon={<Ionicons name="flash" size={18} color="#fff" />}
              />
            ) : (
              <Button
                title="Top Up Wallet First"
                variant="outline"
                onPress={() => router.push(`/wallet?returnTo=/listing/${id}/boost`)}
                icon={<Ionicons name="wallet-outline" size={18} color={COLORS.primary} />}
              />
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.textSecondary, fontSize: 15 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },

  content: { padding: 20, gap: 16 },

  // Listing preview
  listingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listingImg: { width: 64, height: 64, borderRadius: 12, backgroundColor: COLORS.gray100 },
  listingImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  listingInfo: { flex: 1 },
  listingTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 20 },
  listingValue: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  boostedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  boostedText: { fontSize: 11, fontWeight: '600', color: COLORS.accent },

  // Already boosted
  alreadyBoosted: {
    backgroundColor: '#FFFBEB',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alreadyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  alreadyDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },

  // Hero banner
  heroBanner: {
    backgroundColor: '#F59E0B',
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  heroBody: { fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 20 },

  // Benefits
  benefits: { gap: 12 },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  benefitText: { flex: 1 },
  benefitLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  benefitDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, lineHeight: 17 },

  // Plans
  planHeading: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  planCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  planCardActive: { borderColor: COLORS.primary, backgroundColor: '#F0FDF9' },
  planDays: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  planDaysActive: { color: COLORS.primary },
  planSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  planRight: { alignItems: 'flex-end' },
  planPrice: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  planPriceActive: { color: COLORS.primary },
  planFrom: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  planCheck: { position: 'absolute', top: -8, right: -8 },

  // Wallet balance
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  balanceOk: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  balanceLow: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  balanceInfo: { flex: 1 },
  balanceStatus: { fontSize: 13, fontWeight: '700' },
  balanceStatusOk: { color: '#065F46' },
  balanceStatusLow: { color: '#991B1B' },
  balanceLine: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  topUpBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  topUpBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // Lock note
  lockNote: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lockText: { fontSize: 12, color: COLORS.textLight, flex: 1 },
});
