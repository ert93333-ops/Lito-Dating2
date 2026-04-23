/**
 * app/faq.tsx — 자주 묻는 질문 (FAQ) 화면
 */

import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FIcon from "@/components/FIcon";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

interface FaqItem {
  qKo: string;
  qJa: string;
  aKo: string;
  aJa: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    qKo: "lito는 무엇인가요?",
    qJa: "litoとは何ですか？",
    aKo: "lito는 한국과 일본 사용자를 연결하는 데이팅 앱입니다. 기본 채팅과 번역 기능은 무료이며, AI 코칭 기능은 크레딧 방식으로 운영됩니다.",
    aJa: "litoは韓国と日本のユーザーをつなぐマッチングアプリです。基本チャットと翻訳機能は無料で、AIコーチング機能はクレジット制で提供されます。",
  },
  {
    qKo: "매칭은 어떻게 이루어지나요?",
    qJa: "マッチングはどのように行われますか？",
    aKo: "Discover 화면에서 마음에 드는 상대에게 좋아요를 보내세요. 상대방도 나에게 좋아요를 보내면 매칭이 성사됩니다. 매칭 후 채팅이 가능합니다.",
    aJa: "Discoverで気に入った相手にいいねを送りましょう。相手もいいねを返すとマッチング成立。マッチング後はチャットが可能になります。",
  },
  {
    qKo: "번역 기능은 어떻게 사용하나요?",
    qJa: "翻訳機能はどのように使いますか？",
    aKo: "채팅창에서 메시지를 입력하면 자동으로 상대방 언어로 번역되어 전송됩니다. 별도 설정 없이 바로 사용 가능합니다.",
    aJa: "チャット画面でメッセージを送ると、自動的に相手の言語に翻訳されて届きます。特別な設定なしですぐ使えます。",
  },
  {
    qKo: "AI 코치 크레딧은 어떻게 충전하나요?",
    qJa: "AIコーチのクレジットはどう補充しますか？",
    aKo: "프로필 화면 하단의 '크레딧 충전' 버튼 또는 AI 코치 화면에서 구매할 수 있습니다. 다양한 충전 패키지를 제공합니다.",
    aJa: "プロフィール画面下部の「クレジット補充」ボタン、またはAIコーチ画面から購入できます。さまざまな充電パッケージをご用意しています。",
  },
  {
    qKo: "신뢰 점수란 무엇인가요?",
    qJa: "信頼スコアとは何ですか？",
    aKo: "신뢰 점수는 프로필 인증, 신분증 인증, 활동 패턴 등을 기반으로 산정됩니다. 점수가 높을수록 Discover에서 더 잘 노출됩니다.",
    aJa: "信頼スコアはプロフィール認証、本人確認書類、活動パターンなどをもとに算出されます。スコアが高いほどDiscoverで表示されやすくなります。",
  },
  {
    qKo: "신분증 인증은 왜 필요한가요?",
    qJa: "本人確認書類はなぜ必要ですか？",
    aKo: "신분증 인증은 허위 프로필, 사기 계정을 방지하고 안전한 커뮤니티를 유지하기 위해 필요합니다. 인증 완료 시 신뢰 배지가 표시됩니다.",
    aJa: "偽プロフィールや詐欺アカウントを防ぎ、安全なコミュニティを維持するために必要です。認証完了後、信頼バッジが表示されます。",
  },
  {
    qKo: "불쾌한 사용자를 신고하려면?",
    qJa: "不快なユーザーを報告するには？",
    aKo: "상대방 프로필에서 우측 상단 메뉴를 탭하여 '신고하기'를 선택하세요. 채팅 화면에서도 신고할 수 있습니다. 신고된 계정은 운영팀이 검토합니다.",
    aJa: "相手のプロフィールで右上メニューをタップし「報告する」を選択してください。チャット画面からも報告できます。報告されたアカウントはチームが審査します。",
  },
  {
    qKo: "차단하면 상대방이 알 수 있나요?",
    qJa: "ブロックすると相手にわかりますか？",
    aKo: "아니요. 차단해도 상대방에게 알림이 가지 않습니다. 차단된 사람은 나를 발견하거나 메시지를 보낼 수 없게 됩니다.",
    aJa: "いいえ。ブロックしても相手には通知されません。ブロックされた人はあなたを見つけたり、メッセージを送ったりできなくなります。",
  },
  {
    qKo: "계정을 삭제하면 데이터는 어떻게 되나요?",
    qJa: "アカウントを削除するとデータはどうなりますか？",
    aKo: "계정 삭제 요청 시 즉시 비노출 처리되며, 법령에서 정한 보존 기간 이후 모든 데이터가 완전히 삭제됩니다. 삭제 전까지는 재활성화 요청이 가능합니다.",
    aJa: "削除申請後は即座に非表示となり、法令で定められた保存期間後にすべてのデータが完全削除されます。削除完了までは再有効化リクエストが可能です。",
  },
  {
    qKo: "앱 언어를 바꾸려면?",
    qJa: "アプリの言語を変更するには？",
    aKo: "설정 → 환경설정 → 앱 언어에서 한국어/일본어를 선택할 수 있습니다.",
    aJa: "設定 → 環境設定 → アプリ言語から韓国語/日本語を選択できます。",
  },
];

export default function FaqScreen() {
  const colors = useColors();
  const { lang } = useLocale();
  const insets = useSafeAreaInsets();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <FIcon name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.charcoal }]}>
          {lang === "ko" ? "자주 묻는 질문" : "よくある質問"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.list, { borderColor: colors.border }]}>
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <View
                key={i}
                style={[
                  s.item,
                  { borderBottomColor: colors.border },
                  i === FAQ_ITEMS.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <TouchableOpacity
                  style={s.question}
                  onPress={() => toggle(i)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.qText, { color: colors.charcoal }]}>
                    {lang === "ko" ? item.qKo : item.qJa}
                  </Text>
                  <FIcon
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.charcoalLight}
                  />
                </TouchableOpacity>
                {isOpen && (
                  <Text style={[s.aText, { color: colors.charcoalMid }]}>
                    {lang === "ko" ? item.aKo : item.aJa}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        <Text style={[s.footer, { color: colors.charcoalLight }]}>
          {lang === "ko"
            ? "더 궁금한 점이 있으시면 지원팀(litosupport@gmail.com)으로 문의해주세요."
            : "その他ご不明な点はサポート(litosupport@gmail.com)までお問い合わせください。"}
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  list: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    backgroundColor: "white",
    marginBottom: 16,
  },
  item: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  question: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  qText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  aText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  footer: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
