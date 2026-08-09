import { ReactNode, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { EligibilityMeter, StatusPill } from '@/src/components/EligibilityMeter';
import { BarChart } from '@/src/components/charts';
import {
  Body,
  Button,
  Caption,
  Card,
  Input,
  Screen,
  SectionHeader,
} from '@/src/components/ui';
import { Select } from '@/src/components/Select';
import { runEligibilitySuite } from '@/src/lib/eligibility/engine';
import { ProductEstimate, ProductKind } from '@/src/lib/eligibility/types';
import {
  expensesInMonth,
  monthlyIncomeFromProfile,
  sumExpenses,
} from '@/src/lib/finance/metrics';
import { useTheme } from '@/src/hooks/useTheme';
import { useAppStore } from '@/src/store/useAppStore';
import { CountryCode } from '@/src/types';
import { spacing } from '@/src/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const productMeta: Record<
  ProductKind,
  { emoji: string; short: string; color: string; soft: string }
> = {
  home_loan: { emoji: '🏠', short: 'Home loan', color: '#059669', soft: '#D1FAE5' },
  personal_loan: { emoji: '📄', short: 'Personal loan', color: '#0284C7', soft: '#E0F2FE' },
  credit_card: { emoji: '💳', short: 'Credit card', color: '#7C3AED', soft: '#EDE9FE' },
  limit_increase: { emoji: '📈', short: 'Limit increase', color: '#D97706', soft: '#FEF3C7' },
};

export default function EligibilityScreen() {
  const theme = useTheme();
  const settings = useAppStore((s) => s.settings);
  const taxProfile = useAppStore((s) => s.taxProfile);
  const expenses = useAppStore((s) => s.expenses);
  const debts = useAppStore((s) => s.debts);

  const autoIncome = monthlyIncomeFromProfile(taxProfile, settings.monthlyIncome);
  const autoExpenses = sumExpenses(expensesInMonth(expenses));
  const autoDebtPay = debts.reduce((s, d) => s + (d.minPayment || 0), 0);
  const autoCardBal = debts
    .filter((d) => d.kind === 'credit_card')
    .reduce((s, d) => s + d.balance, 0);

  const [country, setCountry] = useState<CountryCode>(settings.preferredCountry);
  const [monthlyIncome, setMonthlyIncome] = useState(String(Math.round(autoIncome) || ''));
  const [monthlyExpenses, setMonthlyExpenses] = useState(
    String(Math.round(autoExpenses) || '')
  );
  const [monthlyDebtPayments, setMonthlyDebtPayments] = useState(
    String(Math.round(autoDebtPay) || '')
  );
  const [creditScore, setCreditScore] = useState('720');
  const [employmentYears, setEmploymentYears] = useState('3');
  const [incomeStable, setIncomeStable] = useState(true);

  const [homePrice, setHomePrice] = useState('450000');
  const [downPayment, setDownPayment] = useState('90000');
  const [mortgageYears, setMortgageYears] = useState('30');

  const [personalLoanAmount, setPersonalLoanAmount] = useState('15000');
  const [personalLoanMonths, setPersonalLoanMonths] = useState('36');

  const [requestedCardLimit, setRequestedCardLimit] = useState('5000');
  const [existingCardLimits, setExistingCardLimits] = useState('8000');
  const [cardBalances, setCardBalances] = useState(String(Math.round(autoCardBal) || '1500'));

  const [currentLimit, setCurrentLimit] = useState('3000');
  const [requestedNewLimit, setRequestedNewLimit] = useState('5000');
  const [monthsWithCard, setMonthsWithCard] = useState('18');
  const [onTimePaymentMonths, setOnTimePaymentMonths] = useState('18');
  const [recentLatePayments, setRecentLatePayments] = useState('0');
  const [incomeIncreasedRecently, setIncomeIncreasedRecently] = useState(false);

  const [activeProduct, setActiveProduct] = useState<ProductKind>('home_loan');
  const [ran, setRan] = useState(false);

  const num = (s: string) => {
    const n = parseFloat(String(s).replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const bundle = useMemo(() => {
    return runEligibilitySuite({
      country,
      monthlyIncome: num(monthlyIncome),
      monthlyExpenses: num(monthlyExpenses),
      monthlyDebtPayments: num(monthlyDebtPayments),
      creditScore: Math.min(900, Math.max(300, num(creditScore))),
      employmentYears: num(employmentYears),
      incomeStable,
      homePrice: num(homePrice),
      downPayment: num(downPayment),
      mortgageYears: num(mortgageYears) || 30,
      primaryResidence: true,
      personalLoanAmount: num(personalLoanAmount),
      personalLoanMonths: num(personalLoanMonths) || 36,
      requestedCardLimit: num(requestedCardLimit),
      existingCardLimits: num(existingCardLimits),
      cardBalances: num(cardBalances),
      currentLimit: num(currentLimit),
      requestedNewLimit: num(requestedNewLimit),
      monthsWithCard: num(monthsWithCard),
      onTimePaymentMonths: num(onTimePaymentMonths),
      recentLatePayments: num(recentLatePayments),
      incomeIncreasedRecently,
    });
  }, [
    country,
    monthlyIncome,
    monthlyExpenses,
    monthlyDebtPayments,
    creditScore,
    employmentYears,
    incomeStable,
    homePrice,
    downPayment,
    mortgageYears,
    personalLoanAmount,
    personalLoanMonths,
    requestedCardLimit,
    existingCardLimits,
    cardBalances,
    currentLimit,
    requestedNewLimit,
    monthsWithCard,
    onTimePaymentMonths,
    recentLatePayments,
    incomeIncreasedRecently,
  ]);

  const active = bundle.products.find((p) => p.product === activeProduct)!;

  const pullFromApp = () => {
    setMonthlyIncome(String(Math.round(autoIncome)));
    setMonthlyExpenses(String(Math.round(autoExpenses)));
    setMonthlyDebtPayments(String(Math.round(autoDebtPay)));
    setCardBalances(String(Math.round(autoCardBal)));
    setCountry(settings.preferredCountry);
  };

  const onSelectProduct = (p: ProductKind) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveProduct(p);
    setRan(true);
  };

  const compareBars = bundle.products.map((p) => ({
    label: productMeta[p.product].short.split(' ')[0],
    value: p.score,
    color: productMeta[p.product].color,
  }));

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={theme.mode === 'dark' ? ['#0F766E', '#1E3A5F'] : ['#0D9488', '#3B82F6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>Suggestive guide only</Text>
          <Text style={styles.heroTitle}>Loan & card eligibility</Text>
          <Text style={styles.heroBody}>
            Plain-language estimates for home loans, personal loans, credit cards, and limit
            increases — using everyday money checks banks often care about. Final yes/no always
            belongs to the bank.
          </Text>
        </LinearGradient>

        <Card style={{ marginTop: -12, backgroundColor: theme.warningSoft }}>
          <Body bold>Important</Body>
          <Caption style={{ marginTop: 6 }}>
            This tool is educational. It does not pull your real credit file, does not contact
            banks, and is not an offer of credit. Approval, rates, and limits stay solely at the
            discretion of each financial institution.
          </Caption>
        </Card>

        <Select
          label="Banking norms"
          value={country}
          options={[
            { value: 'US', label: 'United States norms' },
            { value: 'CA', label: 'Canada norms' },
          ]}
          onChange={setCountry}
          searchable={false}
        />
        <Caption style={{ marginBottom: spacing.sm }}>
          Common debt-ratio and credit themes — each bank still decides.
        </Caption>

        <SectionHeader title="Your money picture" />
        <Caption style={{ marginBottom: spacing.sm }}>
          Pre-filled from your GBP income, expenses, and debt minimums when available — edit freely.
        </Caption>
        <Button label="Refresh from my GBP data" variant="secondary" onPress={pullFromApp} />
        <View style={{ height: spacing.md }} />
        <Input
          label="Monthly take-home pay"
          placeholder="e.g. 5200"
          keyboardType="decimal-pad"
          value={monthlyIncome}
          onChangeText={setMonthlyIncome}
        />
        <Input
          label="Monthly living expenses (rent food utilities… not loan payments)"
          placeholder="e.g. 2800"
          keyboardType="decimal-pad"
          value={monthlyExpenses}
          onChangeText={setMonthlyExpenses}
        />
        <Input
          label="Monthly debt payments already committed"
          placeholder="Mortgage, loans, card minimums…"
          keyboardType="decimal-pad"
          value={monthlyDebtPayments}
          onChangeText={setMonthlyDebtPayments}
        />
        <Input
          label={
            country === 'CA'
              ? 'Credit score estimate (300–900, Equifax/TransUnion style)'
              : 'Credit score estimate (300–850, FICO style)'
          }
          placeholder="e.g. 720"
          keyboardType="number-pad"
          value={creditScore}
          onChangeText={setCreditScore}
        />
        <Input
          label="Years at job / steady self-employment"
          placeholder="e.g. 3"
          keyboardType="decimal-pad"
          value={employmentYears}
          onChangeText={setEmploymentYears}
        />
        <Select
          label="Is income fairly steady?"
          value={incomeStable ? 'yes' : 'no'}
          options={[
            { value: 'yes', label: 'Yes, steady' },
            { value: 'no', label: 'It varies a lot' },
          ]}
          onChange={(v) => setIncomeStable(v === 'yes')}
          searchable={false}
        />

        <SnapshotStrip
          income={bundle.moneySnapshot.monthlyIncome}
          expenses={bundle.moneySnapshot.monthlyExpenses}
          debts={bundle.moneySnapshot.monthlyDebtPayments}
          free={bundle.moneySnapshot.freeCashAfterDebts}
          dti={bundle.moneySnapshot.debtLoadPercent}
        />

        <SectionHeader title="Product details" />
        <Caption style={{ marginBottom: spacing.sm }}>
          Fill the section for the product you care about. Others still run for comparison.
        </Caption>

        <ProductSection title="🏠 Home loan" soft={productMeta.home_loan.soft}>
          <Input
            label="Home price you have in mind"
            placeholder="e.g. 450000"
            keyboardType="decimal-pad"
            value={homePrice}
            onChangeText={setHomePrice}
          />
          <Input
            label="Down payment cash you can put in"
            placeholder="e.g. 90000"
            keyboardType="decimal-pad"
            value={downPayment}
            onChangeText={setDownPayment}
          />
          <Input
            label="Mortgage length (years)"
            placeholder="25 or 30"
            keyboardType="number-pad"
            value={mortgageYears}
            onChangeText={setMortgageYears}
          />
        </ProductSection>

        <ProductSection title="📄 Personal loan" soft={productMeta.personal_loan.soft}>
          <Input
            label="How much would you like to borrow?"
            placeholder="e.g. 15000"
            keyboardType="decimal-pad"
            value={personalLoanAmount}
            onChangeText={setPersonalLoanAmount}
          />
          <Input
            label="Pay it back over how many months?"
            placeholder="e.g. 36"
            keyboardType="number-pad"
            value={personalLoanMonths}
            onChangeText={setPersonalLoanMonths}
          />
        </ProductSection>

        <ProductSection title="💳 New credit card" soft={productMeta.credit_card.soft}>
          <Input
            label="Limit you hope to get"
            placeholder="e.g. 5000"
            keyboardType="decimal-pad"
            value={requestedCardLimit}
            onChangeText={setRequestedCardLimit}
          />
          <Input
            label="Total limits on cards you already have"
            placeholder="e.g. 8000"
            keyboardType="decimal-pad"
            value={existingCardLimits}
            onChangeText={setExistingCardLimits}
          />
          <Input
            label="What you currently owe on those cards"
            placeholder="e.g. 1500"
            keyboardType="decimal-pad"
            value={cardBalances}
            onChangeText={setCardBalances}
          />
        </ProductSection>

        <ProductSection title="📈 Limit increase on a card you have" soft={productMeta.limit_increase.soft}>
          <Input
            label="Current limit on that card"
            placeholder="e.g. 3000"
            keyboardType="decimal-pad"
            value={currentLimit}
            onChangeText={setCurrentLimit}
          />
          <Input
            label="New limit you would like"
            placeholder="e.g. 5000"
            keyboardType="decimal-pad"
            value={requestedNewLimit}
            onChangeText={setRequestedNewLimit}
          />
          <Input
            label="Months you’ve had this card"
            placeholder="e.g. 18"
            keyboardType="number-pad"
            value={monthsWithCard}
            onChangeText={setMonthsWithCard}
          />
          <Input
            label="Months of on-time payments (approx.)"
            placeholder="e.g. 18"
            keyboardType="number-pad"
            value={onTimePaymentMonths}
            onChangeText={setOnTimePaymentMonths}
          />
          <Input
            label="Late payments in the last year"
            placeholder="0 if none"
            keyboardType="number-pad"
            value={recentLatePayments}
            onChangeText={setRecentLatePayments}
          />
          <Select
            label="Did your income go up recently?"
            value={incomeIncreasedRecently ? 'yes' : 'no'}
            options={[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ]}
            onChange={(v) => setIncomeIncreasedRecently(v === 'yes')}
            searchable={false}
          />
        </ProductSection>

        <SectionHeader title="Compare all four" />
        <Card>
          <Caption style={{ marginBottom: 8 }}>Educational score (0–100) side by side</Caption>
          <BarChart data={compareBars} height={160} formatValue={(n) => `${Math.round(n)}`} />
        </Card>

        <SectionHeader title="Pick a product to explore" />
        <View style={styles.productGrid}>
          {bundle.products.map((p) => {
            const meta = productMeta[p.product];
            const selected = activeProduct === p.product;
            return (
              <Pressable
                key={p.product}
                onPress={() => onSelectProduct(p.product)}
                style={[
                  styles.productCard,
                  {
                    backgroundColor: selected ? meta.soft : theme.bgElevated,
                    borderColor: selected ? meta.color : theme.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 22 }}>{meta.emoji}</Text>
                <Text style={[styles.productName, { color: theme.text }]}>{meta.short}</Text>
                <Text style={{ color: meta.color, fontWeight: '800', fontSize: 18 }}>{p.score}</Text>
                <Caption>{p.band}</Caption>
              </Pressable>
            );
          })}
        </View>

        <ResultPanel product={active} ran={ran} />

        <Card style={{ marginTop: spacing.lg, marginBottom: 40, backgroundColor: theme.bgMuted }}>
          <Body bold>In plain English</Body>
          <Caption style={{ marginTop: 8 }}>
            Banks usually ask: Can you afford the payment? Do you already owe too much? Is your
            credit healthy? Is your income steady? Have you put enough money down (for a home)? We
            turn those ideas into simple checks — not a secret bank formula, and never a promise.
          </Caption>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function SnapshotStrip({
  income,
  expenses,
  debts,
  free,
  dti,
}: {
  income: string;
  expenses: string;
  debts: string;
  free: string;
  dti: string;
}) {
  const theme = useTheme();
  const items = [
    { label: 'Pay in', value: income, color: '#0D9488' },
    { label: 'Living costs', value: expenses, color: '#F59E0B' },
    { label: 'Debt payments', value: debts, color: '#F97316' },
    { label: 'Left over', value: free, color: '#059669' },
    { label: 'Debt load', value: dti, color: '#6366F1' },
  ];
  return (
    <View style={styles.snapRow}>
      {items.map((it) => (
        <View
          key={it.label}
          style={[styles.snapCell, { backgroundColor: theme.bgElevated, borderColor: theme.border }]}
        >
          <Text style={{ color: it.color, fontSize: 10, fontWeight: '800' }}>{it.label}</Text>
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700', marginTop: 4 }} numberOfLines={1}>
            {it.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ProductSection({
  title,
  soft,
  children,
}: {
  title: string;
  soft: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.sectionBox,
        { backgroundColor: theme.mode === 'dark' ? theme.bgElevated : soft, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function ResultPanel({ product, ran }: { product: ProductEstimate; ran: boolean }) {
  const theme = useTheme();
  const meta = productMeta[product.product];

  return (
    <Card style={{ borderColor: meta.color, borderWidth: 1.5 }}>
      <View style={styles.resultTop}>
        <EligibilityMeter score={product.score} band={product.band} />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text style={{ fontSize: 20 }}>{meta.emoji}</Text>
          <Body bold style={{ fontSize: 18, marginTop: 4 }}>
            {product.title}
          </Body>
          <Caption style={{ marginTop: 6 }}>{product.headline}</Caption>
          {!ran ? (
            <Caption style={{ marginTop: 8 }}>Tap a product tile above to focus results.</Caption>
          ) : null}
        </View>
      </View>

      <Body muted style={{ marginTop: spacing.md }}>
        {product.summary}
      </Body>

      <SectionHeader title="What we checked" />
      {product.checks.map((c) => (
        <View
          key={c.id}
          style={[styles.checkRow, { borderColor: theme.border, backgroundColor: theme.bgMuted }]}
        >
          <View style={styles.checkHead}>
            <Body bold style={{ flex: 1 }}>
              {c.title}
            </Body>
            <StatusPill status={c.status} />
          </View>
          <Caption style={{ marginTop: 6 }}>{c.detail}</Caption>
          {c.score != null ? (
            <View style={[styles.miniBarTrack, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.miniBarFill,
                  {
                    width: `${Math.min(100, c.score)}%`,
                    backgroundColor:
                      c.status === 'good'
                        ? '#059669'
                        : c.status === 'ok'
                          ? '#0EA5E9'
                          : c.status === 'watch'
                            ? '#F59E0B'
                            : '#F97316',
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      ))}

      <SectionHeader title="Helpful numbers (not offers)" />
      {product.suggestions.map((s) => (
        <View key={s.label} style={styles.suggestRow}>
          <Caption style={{ flex: 1 }}>{s.label}</Caption>
          <Body bold>{s.value}</Body>
        </View>
      ))}

      <SectionHeader title="Simple tips" />
      {product.tips.map((t) => (
        <Caption key={t} style={{ marginBottom: 8 }}>
          • {t}
        </Caption>
      ))}

      <View style={[styles.disclaimer, { backgroundColor: theme.warningSoft }]}>
        <Caption>{product.disclaimer}</Caption>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: 48 },
  hero: {
    borderRadius: 22,
    padding: spacing.xxl,
    marginBottom: spacing.lg,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: -0.5,
  },
  heroBody: {
    color: 'rgba(255,255,255,0.92)',
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm },
  snapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  snapCell: {
    width: '31%',
    flexGrow: 1,
    minWidth: '30%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  sectionBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: spacing.md },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.lg,
  },
  productCard: {
    width: '47%',
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    minHeight: 110,
  },
  productName: { fontWeight: '700', marginTop: 6, fontSize: 13 },
  resultTop: { flexDirection: 'row', alignItems: 'center' },
  checkRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  checkHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniBarTrack: {
    height: 6,
    borderRadius: 99,
    marginTop: 10,
    overflow: 'hidden',
  },
  miniBarFill: { height: '100%', borderRadius: 99 },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(127,127,127,0.25)',
  },
  disclaimer: {
    marginTop: spacing.lg,
    borderRadius: 12,
    padding: 12,
  },
});
