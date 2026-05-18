import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { getDisputeRoom, sendDisputeMessage } from '../../../src/api/dispute.api';
import { useAuthStore } from '../../../src/store/auth.store';
import { getSocket } from '../../../src/hooks/useSocket';
import { COLORS } from '../../../src/utils/currency';
import Avatar from '../../../src/components/ui/Avatar';
import Spinner from '../../../src/components/ui/Spinner';

const STAGE_ORDER = ['opening', 'evidence', 'deliberation', 'ruling', 'closed'];

const STAGE_META = {
  opening:      { label: 'Opening',      icon: '📋', color: COLORS.primary },
  evidence:     { label: 'Evidence',     icon: '🔍', color: COLORS.accent },
  deliberation: { label: 'Deliberation', icon: '⚖️', color: '#7C3AED' },
  ruling:       { label: 'Ruling',       icon: '🔨', color: COLORS.danger },
  closed:       { label: 'Closed',       icon: '✅', color: COLORS.gray400 },
};

const MSG_TYPES = [
  { value: 'text',     label: 'Statement', icon: 'chatbubble-outline' },
  { value: 'evidence', label: 'Evidence',  icon: 'camera-outline' },
  { value: 'question', label: 'Question',  icon: 'help-circle-outline' },
];

// Parse **bold** markdown
function parseBold(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <Text key={i} style={{ fontWeight: '700', color: 'inherit' }}>{part.slice(2, -2)}</Text>
      : part
  );
}

function AriaContent({ content, textStyle }) {
  return (
    <View style={{ gap: 3 }}>
      {content.split('\n').map((line, i) => (
        <Text key={i} style={[styles.ariaText, textStyle]}>
          {parseBold(line)}
        </Text>
      ))}
    </View>
  );
}

function PulsingDot() {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.ariaDot, { opacity: anim }]} />
  );
}

// ── Message renderers ──────────────────────────────────────────────────────────

function SystemMsg({ msg }) {
  return (
    <View style={styles.systemWrap}>
      <Text style={styles.systemText}>{msg.content}</Text>
    </View>
  );
}

function AriaMsg({ msg, isFinal }) {
  const bg     = isFinal ? '#FFFBEB' : COLORS.primaryLight;
  const border = isFinal ? '#FCD34D' : '#A7F3D0';
  const accent = isFinal ? COLORS.accent : COLORS.primary;

  return (
    <View style={styles.ariaWrap}>
      <View style={[styles.ariaAvatar, { backgroundColor: accent }]}>
        <Ionicons name="scale-outline" size={14} color={COLORS.white} />
      </View>
      <View style={styles.ariaBody}>
        <View style={styles.ariaHeader}>
          <Text style={[styles.ariaName, { color: accent }]}>ARIA</Text>
          <View style={[styles.ariaTag, { backgroundColor: isFinal ? '#FEF3C7' : COLORS.primaryLight, borderColor: border }]}>
            <Text style={[styles.ariaTagText, { color: accent }]}>
              {isFinal ? 'Final Decision' : 'AI Mediator'}
            </Text>
          </View>
          <Text style={styles.msgTime}>{format(new Date(msg.createdAt), 'HH:mm')}</Text>
        </View>
        <View style={[styles.ariaBubble, { backgroundColor: bg, borderColor: border }]}>
          <AriaContent content={msg.content} />
        </View>
      </View>
    </View>
  );
}

function RulingMsg({ msg }) {
  return (
    <View style={styles.rulingCard}>
      <View style={styles.rulingHeader}>
        <Ionicons name="hammer-outline" size={20} color="#92400E" />
        <Text style={styles.rulingTitle}>FORMAL RULING</Text>
        <Text style={styles.rulingTime}>{format(new Date(msg.createdAt), 'dd MMM · HH:mm')}</Text>
      </View>
      <Text style={styles.rulingContent}>{msg.content}</Text>
      <Text style={styles.rulingFooter}>Issued by {msg.senderName}</Text>
    </View>
  );
}

function AdminMsg({ msg }) {
  return (
    <View style={styles.adminWrap}>
      <View style={styles.adminAvatar}>
        <Text style={styles.adminAvatarText}>A</Text>
      </View>
      <View style={styles.adminBody}>
        <View style={styles.adminHeader}>
          <Text style={styles.adminName}>{msg.senderName}</Text>
          <Text style={styles.adminTag}>Admin Judge</Text>
          <Text style={styles.msgTime}>{format(new Date(msg.createdAt), 'HH:mm')}</Text>
        </View>
        <View style={styles.adminBubble}>
          <Text style={styles.adminText}>{msg.content}</Text>
        </View>
      </View>
    </View>
  );
}

function MyMsg({ msg }) {
  const bgMap = {
    evidence: COLORS.accent,
    question: '#7C3AED',
    text:     COLORS.primary,
  };
  const labelMap = { evidence: 'Evidence', question: 'Question', text: null };
  const bg    = bgMap[msg.messageType] || COLORS.primary;
  const label = labelMap[msg.messageType];

  return (
    <View style={styles.myMsgWrap}>
      {label && <Text style={styles.myMsgLabel}>{label}</Text>}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end', gap: 6 }}>
        <View style={[styles.myBubble, { backgroundColor: bg }]}>
          <Text style={styles.myText}>{msg.content}</Text>
          <Text style={styles.myTime}>{format(new Date(msg.createdAt), 'HH:mm')}</Text>
        </View>
      </View>
    </View>
  );
}

function OtherMsg({ msg, isClaimant }) {
  const roleLabel = isClaimant ? 'Claimant' : 'Respondent';
  const roleColor = isClaimant ? COLORS.danger : '#2563EB';
  const roleBg    = isClaimant ? '#FEE2E2' : '#DBEAFE';

  return (
    <View style={styles.otherWrap}>
      <Avatar name={msg.senderName} size={30} style={styles.otherAvatar} />
      <View style={styles.otherBody}>
        <View style={styles.otherHeader}>
          <Text style={[styles.otherName, { color: roleColor }]}>{msg.senderName}</Text>
          <View style={[styles.roleTag, { backgroundColor: roleBg }]}>
            <Text style={[styles.roleTagText, { color: roleColor }]}>{roleLabel}</Text>
          </View>
          <Text style={styles.msgTime}>{format(new Date(msg.createdAt), 'HH:mm')}</Text>
        </View>
        <View style={styles.otherBubble}>
          <Text style={styles.otherText}>{msg.content}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Stage progress bar ─────────────────────────────────────────────────────────
function StageBar({ stage }) {
  const currentIdx = STAGE_ORDER.indexOf(stage);
  return (
    <View>
      <View style={styles.stageBarRow}>
        {STAGE_ORDER.map((key, i) => {
          const isDone   = i < currentIdx;
          const isActive = i === currentIdx;
          return (
            <View
              key={key}
              style={[
                styles.stageSegment,
                isDone   && { backgroundColor: COLORS.primary },
                isActive && { backgroundColor: COLORS.primary, opacity: 0.5 },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.stageIconRow}>
        {STAGE_ORDER.map((key) => (
          <Text key={key} style={styles.stageIcon}>{STAGE_META[key]?.icon}</Text>
        ))}
      </View>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function DisputeRoomScreen() {
  const { swapId }  = useLocalSearchParams();
  const router      = useRouter();
  const { user }    = useAuthStore();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState([]);
  const [stage, setStage]       = useState('opening');
  const [roomId, setRoomId]     = useState(null);
  const [input, setInput]       = useState('');
  const [msgType, setMsgType]   = useState('text');
  const flatRef = useRef(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dispute-room', swapId],
    queryFn:  () => getDisputeRoom(swapId),
    retry: 1,
  });

  useEffect(() => {
    if (data) {
      setMessages(data.messages || []);
      setStage(data.room?.stage || 'opening');
      setRoomId(data.room?.id);
    }
  }, [data]);

  // Socket events
  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit('dispute:join', roomId);

    const onMessage = (msg) => {
      const id = msg.id || msg._id;
      setMessages(prev => {
        if (prev.some(m => (m.id || m._id) === id)) return prev;
        return [...prev, msg];
      });
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const onStageChanged = ({ stage: newStage }) => {
      setStage(newStage);
      queryClient.invalidateQueries({ queryKey: ['dispute-room', swapId] });
    };

    const onRuled = () => {
      queryClient.invalidateQueries({ queryKey: ['dispute-room', swapId] });
    };

    socket.on('dispute:message',       onMessage);
    socket.on('dispute:stage_changed', onStageChanged);
    socket.on('dispute:ruled',         onRuled);

    return () => {
      socket.emit('dispute:leave', roomId);
      socket.off('dispute:message',       onMessage);
      socket.off('dispute:stage_changed', onStageChanged);
      socket.off('dispute:ruled',         onRuled);
    };
  }, [roomId, swapId, queryClient]);

  const sendMutation = useMutation({
    mutationFn: () => sendDisputeMessage(roomId, input.trim(), msgType),
    onSuccess: (msg) => {
      setInput('');
      const id = msg.id || msg._id;
      setMessages(prev => prev.some(m => (m.id || m._id) === id) ? prev : [...prev, msg]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    },
  });

  const handleSend = useCallback(() => {
    if (!input.trim() || !roomId || sendMutation.isPending) return;
    sendMutation.mutate();
  }, [input, roomId, sendMutation]);

  const room           = data?.room;
  const isClosed       = room?.status !== 'active';
  const claimantUserId = room?.claimantId?.id;
  const myRole         = room
    ? (room.claimantId?.id === user?.id ? 'Claimant' : 'Respondent')
    : null;
  const stageMeta = STAGE_META[stage] || STAGE_META.opening;

  const renderMessage = ({ item: msg }) => {
    const id = msg.id || msg._id;

    if (msg.messageType === 'system' || msg.senderRole === 'system') {
      return <SystemMsg key={id} msg={msg} />;
    }
    if (msg.messageType === 'ruling') {
      return <RulingMsg key={id} msg={msg} />;
    }
    if (msg.senderRole === 'bot') {
      return <AriaMsg key={id} msg={msg} isFinal={msg.messageType === 'decision'} />;
    }
    if (msg.senderRole === 'admin') {
      return <AdminMsg key={id} msg={msg} />;
    }

    const senderId = msg.senderId?.id || msg.senderId?._id || msg.senderId;
    const isMe     = senderId === user?.id;

    if (isMe) return <MyMsg key={id} msg={msg} />;

    const senderIsClaimant = senderId === claimantUserId;
    return <OtherMsg key={id} msg={msg} isClaimant={senderIsClaimant} />;
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Ionicons name="scale-outline" size={22} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Dispute Court</Text>
        </View>
        <Spinner full />
      </View>
    );
  }

  // ── Error / room not open ────────────────────────────────────────────────────
  if (isError || !room) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dispute Court</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="warning-outline" size={48} color={COLORS.accent} />
          <Text style={styles.emptyTitle}>Court room not open yet</Text>
          <Text style={styles.emptySubtitle}>
            An admin will open the court room shortly. Check back soon.
          </Text>
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>← Back to My Swaps</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main court room ──────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={[styles.ariaAvatarSm, { backgroundColor: COLORS.primary }]}>
          <Ionicons name="scale-outline" size={14} color={COLORS.white} />
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Dispute Court</Text>
            <View style={[styles.stagePill, { backgroundColor: COLORS.primaryLight }]}>
              <Text style={styles.stagePillText}>{stageMeta.icon} {stageMeta.label}</Text>
            </View>
          </View>
          <Text style={styles.headerSub}>
            Case #{swapId?.slice(-8).toUpperCase()}
            {myRole ? `  ·  You: ${myRole}` : ''}
            {room.adminId?.fullName ? `  ·  Judge: ${room.adminId.fullName}` : ''}
          </Text>
        </View>
      </View>

      {/* Stage progress */}
      <View style={styles.stagePadding}>
        <StageBar stage={stage} />
      </View>

      {/* Dispute reason strip */}
      <View style={styles.reasonStrip}>
        <Ionicons name="warning-outline" size={14} color={COLORS.danger} />
        <View style={{ flex: 1 }}>
          <Text style={styles.reasonLabel}>Dispute under mediation</Text>
          {room.swapSnapshot?.disputeReason ? (
            <Text style={styles.reasonText} numberOfLines={1}>
              "{room.swapSnapshot.disputeReason}"
            </Text>
          ) : null}
          {!room.adminId && (
            <Text style={styles.reasonWaiting}>Waiting for an admin judge to be assigned…</Text>
          )}
        </View>
      </View>

      {/* Ruling banner when closed */}
      {isClosed && room.ruling?.decision && (
        <View style={styles.rulingBanner}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#92400E" />
          <View style={{ flex: 1 }}>
            <Text style={styles.rulingBannerTitle}>Ruling issued</Text>
            {room.ruling.adminNote ? (
              <Text style={styles.rulingBannerNote} numberOfLines={1}>"{room.ruling.adminNote}"</Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={styles.emptyMessages}>
          <View style={styles.emptyAriaIcon}>
            <Ionicons name="scale-outline" size={28} color={COLORS.primary} />
          </View>
          <PulsingDot />
          <Text style={styles.emptyMsgTitle}>ARIA is preparing the court room…</Text>
          <Text style={styles.emptyMsgSub}>The opening statement will appear shortly.</Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(item) => item.id || item._id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            sendMutation.isPending ? (
              <View style={styles.sendingRow}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.sendingText}>Sending…</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Input area or closed notice */}
      {!isClosed ? (
        <View style={styles.inputArea}>
          {/* Message type pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typePills}
          >
            {MSG_TYPES.map(({ value, label, icon }) => (
              <TouchableOpacity
                key={value}
                style={[styles.typePill, msgType === value && styles.typePillActive]}
                onPress={() => setMsgType(value)}
              >
                <Ionicons
                  name={icon}
                  size={13}
                  color={msgType === value ? COLORS.white : COLORS.textSecondary}
                />
                <Text style={[styles.typePillText, msgType === value && styles.typePillTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input row */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={
                msgType === 'evidence'
                  ? 'Describe evidence: photos, receipts, tracking…'
                  : msgType === 'question'
                  ? 'Ask the other party or mediator a question…'
                  : 'Present your statement clearly and honestly…'
              }
              placeholderTextColor={COLORS.textLight}
              multiline
              maxLength={1000}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || sendMutation.isPending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!input.trim() || sendMutation.isPending}
            >
              {sendMutation.isPending
                ? <ActivityIndicator size="small" color={COLORS.white} />
                : <Ionicons name="send" size={18} color={COLORS.white} />
              }
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.closedBar}>
          <Text style={styles.closedText}>
            {room.status === 'resolved'
              ? '✅ A ruling has been issued. Proceedings are closed.'
              : 'This proceeding is closed.'}
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.closedLink}>Back to My Swaps →</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  ariaAvatarSm: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerInfo: { flex: 1, gap: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  stagePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  stagePillText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  headerSub: { fontSize: 11, color: COLORS.textSecondary },

  // Stage bar
  stagePadding: {
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4,
    backgroundColor: COLORS.white,
  },
  stageBarRow: { flexDirection: 'row', gap: 3, marginBottom: 3 },
  stageSegment: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: COLORS.gray200,
  },
  stageIconRow: { flexDirection: 'row' },
  stageIcon: { flex: 1, textAlign: 'center', fontSize: 11 },

  // Reason strip
  reasonStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  reasonLabel: { fontSize: 11, fontWeight: '700', color: '#991B1B' },
  reasonText:  { fontSize: 11, color: '#DC2626', fontStyle: 'italic', marginTop: 1 },
  reasonWaiting: { fontSize: 11, color: COLORS.accent, marginTop: 2 },

  // Ruling banner
  rulingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FCD34D',
  },
  rulingBannerTitle: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  rulingBannerNote:  { fontSize: 11, color: '#B45309', fontStyle: 'italic' },

  // Messages
  messagesList: { padding: 12, paddingBottom: 8, gap: 12 },

  // Empty states
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  backLink: { marginTop: 8 },
  backLinkText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },

  emptyMessages: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyAriaIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  ariaDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  emptyMsgTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptyMsgSub:   { fontSize: 13, color: COLORS.textSecondary },

  // System message
  systemWrap: { alignItems: 'center', marginVertical: 4 },
  systemText: {
    fontSize: 11, color: COLORS.textLight,
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 12,
  },

  // ARIA message
  ariaWrap: { flexDirection: 'row', gap: 8, maxWidth: '92%' },
  ariaAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2, flexShrink: 0,
  },
  ariaBody: { flex: 1 },
  ariaHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  ariaName: { fontSize: 12, fontWeight: '700' },
  ariaTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  ariaTagText: { fontSize: 10, fontWeight: '600' },
  ariaBubble: {
    borderRadius: 16, borderBottomLeftRadius: 4,
    padding: 12, borderWidth: 1,
  },
  ariaText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  msgTime: { fontSize: 10, color: COLORS.textLight, marginLeft: 'auto' },

  // Ruling card
  rulingCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 2, borderColor: '#FCD34D',
    borderRadius: 16, padding: 16, gap: 8,
    marginVertical: 4,
  },
  rulingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rulingTitle: { fontSize: 14, fontWeight: '800', color: '#92400E', flex: 1 },
  rulingTime:  { fontSize: 10, color: '#B45309' },
  rulingContent: { fontSize: 13, color: '#78350F', lineHeight: 19 },
  rulingFooter: { fontSize: 11, color: '#B45309', textAlign: 'right', fontStyle: 'italic', marginTop: 4 },

  // Admin message
  adminWrap: { flexDirection: 'row', gap: 8, maxWidth: '88%' },
  adminAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2, flexShrink: 0,
  },
  adminAvatarText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  adminBody: { flex: 1 },
  adminHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  adminName: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  adminTag: { fontSize: 10, color: '#3B82F6', backgroundColor: '#DBEAFE', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  adminBubble: {
    backgroundColor: '#2563EB',
    borderRadius: 16, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  adminText: { fontSize: 14, color: COLORS.white, lineHeight: 20 },

  // My message
  myMsgWrap: { alignItems: 'flex-end', gap: 3 },
  myMsgLabel: { fontSize: 10, color: COLORS.textLight, marginRight: 4 },
  myBubble: {
    maxWidth: '80%',
    borderRadius: 18, borderBottomRightRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  myText: { fontSize: 14, color: COLORS.white, lineHeight: 20 },
  myTime: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 3, textAlign: 'right' },

  // Other party
  otherWrap: { flexDirection: 'row', gap: 8, maxWidth: '88%' },
  otherAvatar: { marginTop: 18, flexShrink: 0 },
  otherBody: { flex: 1 },
  otherHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  otherName: { fontSize: 12, fontWeight: '700' },
  roleTag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  roleTagText: { fontSize: 10, fontWeight: '600' },
  otherBubble: {
    backgroundColor: COLORS.white,
    borderRadius: 16, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  otherText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },

  // Sending indicator
  sendingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'flex-end', paddingRight: 4, paddingTop: 4 },
  sendingText: { fontSize: 11, color: COLORS.textLight },

  // Input
  inputArea: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  typePills: { paddingHorizontal: 12, gap: 6, paddingBottom: 8 },
  typePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, backgroundColor: COLORS.gray100,
  },
  typePillActive: { backgroundColor: COLORS.primary },
  typePillText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  typePillTextActive: { color: COLORS.white },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.gray50,
    borderRadius: 22, borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, color: COLORS.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  sendBtnDisabled: { backgroundColor: COLORS.gray300 },

  // Closed bar
  closedBar: {
    backgroundColor: COLORS.gray50,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    alignItems: 'center', gap: 4,
  },
  closedText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  closedLink: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
});
