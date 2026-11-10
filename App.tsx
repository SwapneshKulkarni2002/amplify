import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  StyleProp,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CATEGORIES, INITIAL_ACTIVITY, INITIAL_DRAFT, PLATFORM_FEE_RATE, REACH_PER_DOLLAR, SEED_CAMPAIGNS } from './src/data';
import { loadSnapshot, saveSnapshot } from './src/services/storage';
import { ActivityItem, AppSnapshot, Campaign, CampaignDraft, CampaignStatus, Category, Contribution, Source } from './src/types';

const C = {
  ink: '#15251E',
  forest: '#174A3B',
  forestDeep: '#12392F',
  leaf: '#DDF1B6',
  leafStrong: '#C8E99A',
  paper: '#F6F7F2',
  white: '#FFFFFF',
  line: '#E5E9DF',
  muted: '#6E7B72',
  quiet: '#9BA49B',
  orange: '#D7734D',
  orangePale: '#FFF0E8',
  bluePale: '#EAF1EA',
  greenPale: '#E9F3E5',
  red: '#B94B3D',
};

type TabName = 'Home' | 'Explore' | 'Create' | 'Activity' | 'Profile';
type Route = 'tabs' | 'detail' | 'create' | 'contribute' | 'receipt' | 'submitted';
type SortMode = 'For you' | 'Ending soon' | 'Most backed';
type ProfileSection = 'campaigns' | 'backed' | 'payments';

const money = (value: number) =>
  `$${Math.round(value).toLocaleString('en-US')}`;
const preciseMoney = (value: number) =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const estimateReach = (amount: number) => Math.max(0, Math.round(amount * REACH_PER_DOLLAR));
const percentFunded = (campaign: Campaign) => Math.min(100, Math.round((campaign.raised / Math.max(1, campaign.goal)) * 100));
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

function App() {
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>('Home');
  const [returnTab, setReturnTab] = useState<TabName>('Home');
  const [route, setRoute] = useState<Route>('tabs');
  const [campaigns, setCampaigns] = useState<Campaign[]>(SEED_CAMPAIGNS);
  const [draft, setDraft] = useState<CampaignDraft>(INITIAL_DRAFT);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>(INITIAL_ACTIVITY);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(SEED_CAMPAIGNS[0].id);
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'All'>('All');
  const [sortMode, setSortMode] = useState<SortMode>('For you');
  const [step, setStep] = useState(0);
  const [contributionStep, setContributionStep] = useState(0);
  const [contributionAmount, setContributionAmount] = useState(25);
  const [customAmount, setCustomAmount] = useState('');
  const [contributionResult, setContributionResult] = useState<'success' | 'failed'>('success');
  const [profileSection, setProfileSection] = useState<ProfileSection>('campaigns');
  const [dashboardFilter, setDashboardFilter] = useState<'All' | 'Drafts' | 'In review' | 'Funding' | 'Completed'>('All');
  const [showUseOfFunds, setShowUseOfFunds] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let mounted = true;
    loadSnapshot().then((stored) => {
      if (!mounted) return;
      if (stored) {
        if (Array.isArray(stored.campaigns)) setCampaigns(stored.campaigns);
        if (stored.draft) setDraft({ ...INITIAL_DRAFT, ...stored.draft });
        if (Array.isArray(stored.contributions)) setContributions(stored.contributions);
        if (Array.isArray(stored.following)) setFollowing(stored.following);
        if (Array.isArray(stored.activity)) setActivity(stored.activity);
      }
      setReady(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const snapshot: AppSnapshot = { campaigns, draft, contributions, following, activity };
    saveSnapshot(snapshot);
  }, [ready, campaigns, draft, contributions, following, activity]);

  useEffect(() => {
    if (!toastVisible) return;
    const timer = setTimeout(() => setToastVisible(false), 2500);
    return () => clearTimeout(timer);
  }, [toastVisible]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [route, step, contributionStep, activeTab]);

  const selectedCampaign = campaigns.find((item) => item.id === selectedCampaignId) ?? campaigns[0];
  const openCampaigns = useMemo(
    () => campaigns.filter((item) => item.status === 'Funding open' || item.status === 'Funding goal reached'),
    [campaigns],
  );
  const filteredCampaigns = useMemo(() => {
    const search = query.trim().toLowerCase();
    let items = openCampaigns.filter((campaign) => {
      const matchesCategory = selectedCategory === 'All' || campaign.category === selectedCategory;
      const searchable = `${campaign.title} ${campaign.creator} ${campaign.summary} ${campaign.category}`.toLowerCase();
      return matchesCategory && (!search || searchable.includes(search));
    });
    if (sortMode === 'Ending soon') items = [...items].sort((a, b) => a.daysLeft - b.daysLeft);
    if (sortMode === 'Most backed') items = [...items].sort((a, b) => percentFunded(b) - percentFunded(a));
    return items;
  }, [openCampaigns, query, selectedCategory, sortMode]);

  const showToast = (message: string) => {
    setToast(message);
    setToastVisible(true);
  };

  const navigate = (tab: TabName) => {
    if (tab === 'Create') {
      if (route !== 'create') setReturnTab(activeTab === 'Create' ? 'Home' : activeTab);
      setActiveTab('Create');
      setRoute('create');
      setFormError('');
      return;
    }
    setActiveTab(tab);
    setRoute('tabs');
  };

  const openCampaign = (campaign: Campaign) => {
    setReturnTab(activeTab);
    setSelectedCampaignId(campaign.id);
    setFeedback(null);
    setShowUseOfFunds(false);
    setRoute('detail');
  };

  const backToOrigin = () => {
    setRoute('tabs');
    setActiveTab(returnTab === 'Create' ? 'Home' : returnTab);
  };

  const beginContribution = (campaign: Campaign) => {
    setSelectedCampaignId(campaign.id);
    setContributionAmount(25);
    setCustomAmount('');
    setContributionStep(0);
    setContributionResult('success');
    setRoute('contribute');
  };

  const updateDraft = <K extends keyof CampaignDraft,>(key: K, value: CampaignDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError('');
  };

  const beginNewCampaign = () => {
    setReturnTab(activeTab);
    setActiveTab('Create');
    setStep(0);
    setFormError('');
    setRoute('create');
  };

  const saveDraft = () => {
    setFormError('');
    showToast('Draft saved on this device. You can come back to it anytime.');
  };

  const toggleFollow = (campaign: Campaign) => {
    setFollowing((current) => {
      const isFollowing = current.includes(campaign.id);
      return isFollowing ? current.filter((id) => id !== campaign.id) : [...current, campaign.id];
    });
    showToast(following.includes(campaign.id) ? 'Campaign removed from your saved list.' : 'Campaign saved. We’ll show its updates in Activity.');
  };

  const shareCampaign = async (campaign: Campaign) => {
    try {
      await Share.share({
        message: `${campaign.title} — read the story and see how community funding can help it reach more people.`,
        title: campaign.title,
      });
    } catch {
      showToast('Sharing is unavailable right now.');
    }
  };

  const toggleChannel = (channel: string) => {
    const exists = draft.channels.includes(channel);
    updateDraft('channels', exists ? draft.channels.filter((item) => item !== channel) : [...draft.channels, channel]);
  };

  const addSource = () => updateDraft('sources', [...draft.sources, { title: '', url: '', publisher: '' }]);
  const updateSource = (index: number, key: keyof Source, value: string) => {
    updateDraft('sources', draft.sources.map((source, i) => i === index ? { ...source, [key]: value } : source));
  };
  const removeSource = (index: number) => updateDraft('sources', draft.sources.filter((_, i) => i !== index));

  const pickImage = async (field: 'coverUri' | 'adImageUri') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo access needed', 'Allow photo access to choose a campaign visual.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        updateDraft(field, result.assets[0].uri);
        showToast(field === 'coverUri' ? 'Campaign cover added.' : 'Advertising visual added.');
      }
    } catch {
      showToast('The photo library could not be opened. You can continue with a demo visual.');
    }
  };

  const fillVoiceDemo = () => {
    setDraft((current) => ({
      ...current,
      title: 'Bring shade to the hottest blocks',
      category: 'Environment',
      creator: 'Eastside Neighbors',
      summary: 'Help residents see where more street trees could make a difference.',
      storyHeadline: 'Shade belongs where the heat is',
      introduction: 'Our neighborhood has long stretches of pavement and very little cover on the hottest days. We want the city to use local heat data and resident knowledge to guide new tree planting.',
      storyBody: 'A clear map can show which blocks are missing shade and help neighbors make a practical case for a fair planting plan. We are asking residents, community groups and city planners to look at the same information and decide where the next trees can do the most good.',
      sources: [
        { title: 'Heat islands', publisher: 'U.S. EPA', url: 'https://www.epa.gov/heatislands' },
      ],
      audienceAction: 'Ask the city to publish a neighborhood planting plan.',
      adHeadline: 'Where would more shade help?',
      adDescription: 'Explore a community-led case for planting trees where heat is highest.',
      location: 'Eastside neighborhoods',
      intendedAudience: 'Residents, urban planners and community groups',
      fundingGoal: '9000',
    }));
    setFormError('');
    showToast('Voice demo filled an editable draft. Review and change every field before submitting.');
  };

  const fillAssistDemo = () => {
    setDraft((current) => ({
      ...current,
      title: current.title || 'Make neighborhood shade a priority',
      category: current.category || 'Environment',
      creator: current.creator || 'Your community group',
      summary: current.summary || 'Bring more people into the conversation about where street trees can help most.',
    }));
    showToast('Demo assist suggested editable starting copy.');
  };

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!draft.title.trim() || !draft.category || !draft.creator.trim() || !draft.summary.trim()) {
        setFormError('Add a title, category, creator name and short summary to continue.');
        return false;
      }
      if (draft.title.length > 60) {
        setFormError('Keep the campaign title within 60 characters.');
        return false;
      }
    }
    if (step === 1) {
      const hasSource = draft.sources.some((source) => source.title.trim() && /^https?:\/\//i.test(source.url.trim()));
      if (!draft.storyHeadline.trim() || !draft.introduction.trim() || !draft.storyBody.trim() || !hasSource) {
        setFormError('Add a headline, story, and at least one titled source with a valid web address.');
        return false;
      }
    }
    if (step === 2 && (!draft.adHeadline.trim() || !draft.adDescription.trim())) {
      setFormError('Add an advertising headline and description.');
      return false;
    }
    if (step === 3 && (!draft.location.trim() || !draft.intendedAudience.trim() || draft.channels.length === 0)) {
      setFormError('Choose a location, describe the audience and select at least one channel.');
      return false;
    }
    if (step === 4) {
      if (Number(draft.fundingGoal) < 100 || !Number.isFinite(Number(draft.fundingGoal))) {
        setFormError('Set a funding goal of at least $100.');
        return false;
      }
      if (!draft.rulesAccepted) {
        setFormError('Confirm the campaign rules and submission policies to continue.');
        return false;
      }
    }
    setFormError('');
    return true;
  };

  const continueStep = () => {
    if (!validateStep()) return;
    if (step < 4) setStep((current) => current + 1);
  };

  const submitCampaign = () => {
    if (!validateStep()) return;
    const goal = Number(draft.fundingGoal);
    const sources = draft.sources.filter((source) => source.title.trim() && /^https?:\/\//i.test(source.url.trim()));
    const freshCampaign: Campaign = {
      id: makeId('community'),
      title: draft.title.trim(),
      creator: draft.creator.trim(),
      category: draft.category as Category,
      summary: draft.summary.trim(),
      coverUrl: draft.coverUri || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=85',
      adImageUrl: draft.adImageUri || draft.coverUri || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=85',
      raised: 0,
      goal,
      daysLeft: Number(draft.durationDays) || 14,
      status: 'In review',
      story: [
        { heading: draft.storyHeadline.trim(), text: draft.introduction.trim() },
        { heading: 'Why this matters', text: draft.storyBody.trim() },
      ],
      sources,
      intendedAudience: draft.intendedAudience.trim(),
      location: draft.location.trim(),
      channels: [...draft.channels],
      dailyBudget: Number(draft.dailyBudget) || 0,
      durationDays: Number(draft.durationDays) || 14,
      adHeadline: draft.adHeadline.trim(),
      adDescription: draft.adDescription.trim(),
      callToAction: draft.callToAction.trim() || 'Learn more',
      reachAtGoal: estimateReach(goal),
      isDemo: false,
    };
    setCampaigns((current) => [freshCampaign, ...current]);
    setActivity((current) => [{
      id: makeId('activity'),
      title: 'Campaign submitted for review',
      body: `${freshCampaign.title} is now in your campaign dashboard. The team will review its story, sources and distribution plan.`,
      createdAt: 'Just now',
      campaignId: freshCampaign.id,
      unread: true,
      kind: 'review',
    }, ...current]);
    setSelectedCampaignId(freshCampaign.id);
    setDraft(INITIAL_DRAFT);
    setRoute('submitted');
    setActiveTab('Profile');
    setProfileSection('campaigns');
  };

  const completeContribution = (status: 'completed' | 'failed') => {
    const fee = Math.round(contributionAmount * PLATFORM_FEE_RATE * 100) / 100;
    const contribution: Contribution = {
      id: makeId(status === 'completed' ? 'receipt' : 'attempt'),
      campaignId: selectedCampaign.id,
      amount: contributionAmount,
      fee,
      createdAt: new Date().toISOString(),
      status,
    };
    setContributions((current) => [contribution, ...current]);
    if (status === 'completed') {
      setCampaigns((current) => current.map((campaign) => {
        if (campaign.id !== selectedCampaign.id) return campaign;
        const updatedRaised = Math.min(campaign.goal, campaign.raised + contributionAmount);
        return { ...campaign, raised: updatedRaised, status: updatedRaised >= campaign.goal ? 'Funding goal reached' : campaign.status };
      }));
      setActivity((current) => [{
        id: makeId('activity'),
        title: 'Demo contribution recorded',
        body: `${money(contributionAmount)} is now reflected in ${selectedCampaign.title}’s demo funding progress.`,
        createdAt: 'Just now',
        campaignId: selectedCampaign.id,
        unread: true,
        kind: 'contribution',
      }, ...current]);
    }
    setContributionResult(status === 'completed' ? 'success' : 'failed');
    setRoute('receipt');
  };

  const markAllRead = () => {
    setActivity((current) => current.map((item) => ({ ...item, unread: false })));
    showToast('Activity marked as read.');
  };

  const openSource = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      showToast('This source link could not be opened.');
    }
  };

  const myCampaigns = campaigns.filter((campaign) => !campaign.isDemo);
  const backedCampaignIds = [...new Set(contributions.filter((item) => item.status === 'completed').map((item) => item.campaignId))];
  const backedCampaigns = campaigns.filter((campaign) => backedCampaignIds.includes(campaign.id));
  const unreadCount = activity.filter((item) => item.unread).length;
  const sourceRows = (sources: Source[]) => sources.map((source, index) => (
    <Pressable key={`${source.url}-${index}`} style={styles.sourceRow} onPress={() => openSource(source.url)} accessibilityRole="link">
      <View style={styles.sourceIcon}><Text style={styles.sourceIconText}>↗</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sourceTitle}>{source.title}</Text>
        <Text style={styles.sourcePublisher}>{source.publisher || 'Supporting source'} · Opens source</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  ));

  if (!ready) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingScreen}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>a</Text></View>
          <Text style={styles.brandName}>amplify</Text>
          <Text style={styles.bodyMuted}>Make room for better messages.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderBrandHeader = () => (
    <View style={styles.brandHeader}>
      <View style={styles.brandLockup}>
        <View style={styles.brandMarkSmall}><Text style={styles.brandMarkSmallText}>a</Text></View>
        <Text style={styles.brandNameSmall}>amplify</Text>
      </View>
      <Pressable style={styles.headerActivityButton} onPress={() => navigate('Activity')} accessibilityRole="button" accessibilityLabel={`Activity${unreadCount ? `, ${unreadCount} unread` : ''}`}>
        <Text style={styles.headerActivityGlyph}>◷</Text>
        {unreadCount > 0 && <View style={styles.unreadDot} />}
      </Pressable>
    </View>
  );

  const renderHome = () => (
    <>
      {renderBrandHeader()}
      <View style={styles.homeHero}>
        <View style={styles.heroArtwork}>
          <View style={styles.heroOrbLarge} />
          <View style={styles.heroOrbSmall} />
          <Text style={styles.heroSpark}>✳</Text>
          <Text style={styles.heroArrow}>↗</Text>
        </View>
        <Text style={styles.eyebrowLight}>COMMUNITY-FUNDED REACH</Text>
        <Text style={styles.homeHeroTitle}>Good messages deserve a bigger room.</Text>
        <Text style={styles.homeHeroBody}>Bring people together to carry important stories beyond the networks they already know.</Text>
        <View style={styles.heroEstimate}>
          <Text style={styles.heroEstimateDot}>●</Text>
          <Text style={styles.heroEstimateText}>$1 could reach about 27 people</Text>
          <Text style={styles.heroEstimateLabel}>EST.</Text>
        </View>
        <View style={styles.heroActions}>
          <Button title="Explore campaigns" onPress={() => navigate('Explore')} variant="light" />
          <Button title="Start a campaign" onPress={beginNewCampaign} variant="heroGhost" />
        </View>
        <Text style={styles.heroFootnote}>A configurable estimate, never a guarantee.</Text>
      </View>

      <SectionHeading eyebrow="GOOD THINGS ARE MOVING" title="Campaigns to know" action="See all" onAction={() => navigate('Explore')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
        {openCampaigns.slice(0, 4).map((campaign) => (
          <View key={campaign.id} style={styles.horizontalCardWrap}>
            <CampaignCard
              campaign={campaign}
              compact
              followed={following.includes(campaign.id)}
              onOpen={() => openCampaign(campaign)}
              onBack={() => beginContribution(campaign)}
              onSave={() => toggleFollow(campaign)}
            />
          </View>
        ))}
      </ScrollView>

      <SectionHeading eyebrow="A CLEAR WAY TO TAKE PART" title="Create. Review. Amplify." />
      <View style={styles.howCard}>
        <HowStep number="01" title="Create" body="A creator shares a message, its story and the sources behind it." />
        <View style={styles.howDivider} />
        <HowStep number="02" title="Review" body="The platform checks eligibility and prepares the campaign." />
        <View style={styles.howDivider} />
        <HowStep number="03" title="Amplify" body="Backers pool funds to help the message reach new audiences." />
      </View>

      <View style={styles.truthCard}>
        <View style={styles.truthIcon}><Text style={styles.truthIconText}>i</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.truthTitle}>What does backing pay for?</Text>
          <Text style={styles.truthBody}>It supports distribution of the campaign message. It is not a donation to the cause or organization in the story.</Text>
        </View>
      </View>

      <View style={styles.homeBottomCallout}>
        <Text style={styles.eyebrow}>HAVE A MESSAGE TO SHARE?</Text>
        <Text style={styles.homeBottomTitle}>Give it a thoughtful start.</Text>
        <Text style={styles.bodyMuted}>Draft at your own pace. Your work saves as you go.</Text>
        <Button title="Create a campaign" onPress={beginNewCampaign} icon="＋" style={{ marginTop: 18 }} />
      </View>
    </>
  );

  const renderExplore = () => (
    <>
      <View style={styles.pageHeader}>
        <Text style={styles.eyebrow}>OPEN TO EVERYONE · NO ACCOUNT NEEDED</Text>
        <Text style={styles.pageTitle}>Find a message worth carrying.</Text>
        <Text style={styles.pageSubtitle}>Explore the story, read its sources and decide what deserves a wider audience.</Text>
      </View>
      <View style={styles.searchBox}>
        <Text style={styles.searchGlyph}>⌕</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search campaigns or creators"
          placeholderTextColor={C.quiet}
          style={styles.searchInput}
          returnKeyType="search"
          accessibilityLabel="Search campaigns or creators"
        />
        {!!query && <Pressable onPress={() => setQuery('')}><Text style={styles.clearSearch}>×</Text></Pressable>}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {(['All', ...CATEGORIES] as Array<Category | 'All'>).map((category) => (
          <ChoiceChip key={category} label={category} selected={selectedCategory === category} onPress={() => setSelectedCategory(category)} />
        ))}
      </ScrollView>
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>{filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'campaign' : 'campaigns'}</Text>
        <View style={styles.sortPill}>
          <Text style={styles.sortLabel}>SORT</Text>
          <Pressable onPress={() => setSortMode((current) => current === 'For you' ? 'Ending soon' : current === 'Ending soon' ? 'Most backed' : 'For you')} accessibilityRole="button" accessibilityLabel={`Sort: ${sortMode}`}>
            <Text style={styles.sortValue}>{sortMode} ⌄</Text>
          </Pressable>
        </View>
      </View>
      {filteredCampaigns.length ? (
        filteredCampaigns.map((campaign) => (
          <View key={campaign.id} style={{ marginBottom: 18 }}>
            <CampaignCard
              campaign={campaign}
              followed={following.includes(campaign.id)}
              onOpen={() => openCampaign(campaign)}
              onBack={() => beginContribution(campaign)}
              onSave={() => toggleFollow(campaign)}
            />
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIllustration}><Text style={styles.emptyIllustrationText}>⌕</Text></View>
          <Text style={styles.emptyTitle}>No campaigns found</Text>
          <Text style={styles.bodyMuted}>Try a different search or clear your category filters.</Text>
          <Button title="Clear filters" onPress={() => { setQuery(''); setSelectedCategory('All'); setSortMode('For you'); }} variant="secondary" style={{ marginTop: 18 }} />
        </View>
      )}
    </>
  );

  const renderActivity = () => (
    <>
      <View style={styles.pageHeader}>
        <Text style={styles.eyebrow}>YOUR CAMPAIGN UPDATES</Text>
        <View style={styles.titleWithAction}>
          <Text style={[styles.pageTitle, { flex: 1, marginBottom: 0 }]}>Activity</Text>
          {unreadCount > 0 && <Pressable onPress={markAllRead} style={styles.markReadButton}><Text style={styles.markReadText}>Mark all read</Text></Pressable>}
        </View>
        <Text style={styles.pageSubtitle}>Funding milestones, reviews and stories from campaigns you follow.</Text>
      </View>
      {activity.length ? activity.map((item) => (
        <Pressable
          key={item.id}
          style={[styles.activityCard, item.unread && styles.activityCardUnread]}
          onPress={() => {
            setActivity((current) => current.map((entry) => entry.id === item.id ? { ...entry, unread: false } : entry));
            const campaign = item.campaignId ? campaigns.find((entry) => entry.id === item.campaignId) : undefined;
            if (campaign) openCampaign(campaign);
          }}
          accessibilityRole="button"
        >
          <View style={[styles.activityIcon, item.kind === 'milestone' ? styles.activityIconMilestone : item.kind === 'review' ? styles.activityIconReview : styles.activityIconDefault]}>
            <Text style={styles.activityGlyph}>{item.kind === 'milestone' ? '↗' : item.kind === 'review' ? '✓' : item.kind === 'contribution' ? '$' : '✳'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.activityTitleRow}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              {item.unread && <View style={styles.activityUnreadDot} />}
            </View>
            <Text style={styles.activityBody}>{item.body}</Text>
            <Text style={styles.activityTime}>{item.createdAt}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      )) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIllustration}><Text style={styles.emptyIllustrationText}>◷</Text></View>
          <Text style={styles.emptyTitle}>You’re all caught up</Text>
          <Text style={styles.bodyMuted}>Follow a campaign and its meaningful updates will show up here.</Text>
          <Button title="Explore campaigns" onPress={() => navigate('Explore')} style={{ marginTop: 18 }} />
        </View>
      )}
    </>
  );

  const visibleDashboardCampaigns = myCampaigns.filter((campaign) => {
    if (dashboardFilter === 'All') return true;
    if (dashboardFilter === 'Drafts') return false;
    if (dashboardFilter === 'In review') return campaign.status === 'In review' || campaign.status === 'Changes requested';
    if (dashboardFilter === 'Funding') return campaign.status === 'Funding open' || campaign.status === 'Funding goal reached' || campaign.status === 'Promoting';
    return campaign.status === 'Completed';
  });

  const resumeDraft = () => {
    setReturnTab('Profile');
    setActiveTab('Create');
    setStep(0);
    setRoute('create');
  };

  const renderProfile = () => (
    <>
      <View style={styles.profileHeader}>
        <Text style={styles.eyebrow}>YOUR AMPLIFY SPACE</Text>
        <View style={styles.profileIdentity}>
          <View style={styles.avatar}><Text style={styles.avatarText}>G</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>Guest participant</Text>
            <Text style={styles.bodyMuted}>Browse and back campaigns without signing in.</Text>
          </View>
          <View style={styles.guestBadge}><Text style={styles.guestBadgeText}>GUEST</Text></View>
        </View>
      </View>

      <View style={styles.dashboardTop}>
        <View>
          <Text style={styles.dashboardTitle}>Creator dashboard</Text>
          <Text style={styles.dashboardSubtitle}>Your drafts and campaign progress in one place.</Text>
        </View>
        <Button title="＋ New" onPress={beginNewCampaign} variant="secondary" small />
      </View>

      <View style={styles.metricStrip}>
        <Metric value={`${myCampaigns.length}`} label="YOUR CAMPAIGNS" />
        <View style={styles.metricDivider} />
        <Metric value={`${contributions.filter((item) => item.status === 'completed').length}`} label="BACKINGS" />
        <View style={styles.metricDivider} />
        <Metric value={`${following.length}`} label="SAVED" />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {(['All', 'Drafts', 'In review', 'Funding', 'Completed'] as const).map((filter) => (
          <ChoiceChip key={filter} label={`${filter}${filter === 'In review' ? ` ${myCampaigns.filter((item) => item.status === 'In review').length}` : ''}`} selected={dashboardFilter === filter} onPress={() => setDashboardFilter(filter)} />
        ))}
      </ScrollView>

      {dashboardFilter === 'Drafts' ? (
        <View style={styles.draftCard}>
          <View style={styles.draftIcon}><Text style={styles.draftIconText}>✎</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.draftCardTitle}>{draft.title || 'Your campaign draft'}</Text>
            <Text style={styles.draftCardSubtitle}>Saved automatically on this device · Editable anytime</Text>
          </View>
          <Pressable onPress={resumeDraft}><Text style={styles.inlineAction}>Resume ›</Text></Pressable>
        </View>
      ) : visibleDashboardCampaigns.length ? (
        visibleDashboardCampaigns.map((campaign) => (
          <CreatorCampaignRow key={campaign.id} campaign={campaign} onPress={() => openCampaign(campaign)} />
        ))
      ) : (
        <View style={styles.emptyStateCompact}>
          <Text style={styles.emptyTitle}>{dashboardFilter === 'All' ? 'Your first story starts here' : `No ${dashboardFilter.toLowerCase()} campaigns yet`}</Text>
          <Text style={styles.bodyMuted}>{dashboardFilter === 'All' ? 'Build a message, add its sources and choose the audience you hope to reach.' : 'When a campaign reaches this stage, you’ll find its status and next steps here.'}</Text>
          <Button title="Start a campaign" onPress={beginNewCampaign} style={{ marginTop: 16 }} />
        </View>
      )}

      <View style={styles.profileSectionCard}>
        <Text style={styles.cardSectionTitle}>Your activity</Text>
        <View style={styles.segmentRow}>
          {(['campaigns', 'backed', 'payments'] as ProfileSection[]).map((section) => (
            <Pressable key={section} onPress={() => setProfileSection(section)} style={[styles.segment, profileSection === section && styles.segmentActive]}>
              <Text style={[styles.segmentText, profileSection === section && styles.segmentTextActive]}>{section === 'campaigns' ? 'Campaigns' : section === 'backed' ? 'Backed' : 'Payments'}</Text>
            </Pressable>
          ))}
        </View>
        {profileSection === 'campaigns' && (
          <View style={styles.savedCampaignList}>
            {following.length ? campaigns.filter((campaign) => following.includes(campaign.id)).map((campaign) => (
              <Pressable key={campaign.id} style={styles.savedCampaignRow} onPress={() => openCampaign(campaign)}>
                <Image source={{ uri: campaign.coverUrl }} style={styles.savedThumb} />
                <View style={{ flex: 1 }}><Text numberOfLines={2} style={styles.savedTitle}>{campaign.title}</Text><Text style={styles.savedMeta}>{campaign.category} · {campaign.status}</Text></View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            )) : <Text style={styles.emptyInline}>Save a campaign to keep it close.</Text>}
          </View>
        )}
        {profileSection === 'backed' && (
          <View style={styles.savedCampaignList}>
            {backedCampaigns.length ? backedCampaigns.map((campaign) => {
              const total = contributions.filter((item) => item.campaignId === campaign.id && item.status === 'completed').reduce((sum, item) => sum + item.amount, 0);
              return <Pressable key={campaign.id} style={styles.savedCampaignRow} onPress={() => openCampaign(campaign)}><Image source={{ uri: campaign.coverUrl }} style={styles.savedThumb} /><View style={{ flex: 1 }}><Text numberOfLines={2} style={styles.savedTitle}>{campaign.title}</Text><Text style={styles.savedMeta}>{money(total)} toward message distribution</Text></View><Text style={styles.chevron}>›</Text></Pressable>;
            }) : <Text style={styles.emptyInline}>Your campaign backings will appear here.</Text>}
          </View>
        )}
        {profileSection === 'payments' && (
          <View style={styles.paymentList}>
            {contributions.length ? contributions.map((contribution) => {
              const campaign = campaigns.find((item) => item.id === contribution.campaignId);
              return <View key={contribution.id} style={styles.paymentRow}><View style={[styles.paymentStatusDot, contribution.status === 'completed' ? styles.paymentComplete : styles.paymentFailed]} /><View style={{ flex: 1 }}><Text style={styles.savedTitle}>{campaign?.title || 'Campaign'}</Text><Text style={styles.savedMeta}>{contribution.status === 'completed' ? 'Demo payment complete' : 'Demo payment failed'} · {new Date(contribution.createdAt).toLocaleDateString()}</Text></View><Text style={styles.paymentAmount}>{money(contribution.amount)}</Text></View>;
            }) : <Text style={styles.emptyInline}>No payment history yet. Demo contributions are labelled clearly before checkout.</Text>}
          </View>
        )}
      </View>

      <View style={styles.helpCard}>
        <Text style={styles.eyebrow}>NEED A HAND?</Text>
        <Text style={styles.helpTitle}>Clear answers, no maze.</Text>
        <Text style={styles.bodyMuted}>Learn how campaign review, funding and distribution fit together.</Text>
        <View style={styles.helpLinks}>
          <Pressable onPress={() => showToast('Create → Review → Amplify. Approved campaigns are prepared for distribution after funding and setup.') } style={styles.helpLink}><Text style={styles.helpLinkText}>How it works <Text style={styles.chevron}>›</Text></Text></Pressable>
          <Pressable onPress={() => showToast('Contributions support message distribution, less the disclosed demo fee. Unspent funds follow the campaign policy.') } style={styles.helpLink}><Text style={styles.helpLinkText}>Funding & fees <Text style={styles.chevron}>›</Text></Text></Pressable>
          <Pressable onPress={() => showToast('Campaign sources stay visible on the public story page. Backer names are private by default.') } style={styles.helpLink}><Text style={styles.helpLinkText}>Privacy & sources <Text style={styles.chevron}>›</Text></Text></Pressable>
        </View>
      </View>
    </>
  );

  const renderDetail = () => (
    <>
      <View style={styles.detailHeroWrap}>
        <ImageBackground source={{ uri: selectedCampaign.coverUrl }} style={styles.detailHero} imageStyle={styles.detailHeroImage}>
          <View style={styles.detailHeroOverlay} />
          <View style={styles.detailHeroTop}>
            <Pressable onPress={backToOrigin} style={styles.circleButtonLight} accessibilityRole="button" accessibilityLabel="Back"><Text style={styles.backGlyph}>‹</Text></Pressable>
            <View style={{ flexDirection: 'row', gap: 9 }}>
              <Pressable onPress={() => toggleFollow(selectedCampaign)} style={styles.circleButtonLight} accessibilityRole="button" accessibilityLabel={following.includes(selectedCampaign.id) ? 'Remove from saved' : 'Save campaign'}><Text style={styles.circleButtonGlyph}>{following.includes(selectedCampaign.id) ? '♥' : '♡'}</Text></Pressable>
              <Pressable onPress={() => shareCampaign(selectedCampaign)} style={styles.circleButtonLight} accessibilityRole="button" accessibilityLabel="Share campaign"><Text style={styles.circleButtonGlyph}>↗</Text></Pressable>
            </View>
          </View>
          <View style={styles.detailHeroBottom}>
            <Tag label={selectedCampaign.category} light />
            <Text style={styles.detailHeroTitle}>{selectedCampaign.title}</Text>
          </View>
        </ImageBackground>
      </View>
      <View style={styles.detailContent}>
        <View style={styles.detailBylineRow}>
          <View style={styles.creatorAvatar}><Text style={styles.creatorAvatarText}>{selectedCampaign.creator.slice(0, 1)}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.creatorName}>{selectedCampaign.creator}</Text>
            <Text style={styles.creatorMeta}>{selectedCampaign.isDemo ? 'Community campaign · Demo data' : 'Community campaign · Submitted for review'}</Text>
          </View>
          <StatusPill status={selectedCampaign.status} />
        </View>

        <Text style={styles.detailLead}>{selectedCampaign.summary}</Text>
        {selectedCampaign.isDemo && <Text style={styles.demoDataNote}>DEMO CAMPAIGN · figures illustrate the prototype only</Text>}

        <View style={styles.progressPanel}>
          <View style={styles.progressTopline}>
            <View><Text style={styles.progressEyebrow}>RAISED SO FAR</Text><Text style={styles.progressRaised}>{money(selectedCampaign.raised)} <Text style={styles.progressGoal}>of {money(selectedCampaign.goal)}</Text></Text></View>
            <View style={styles.progressPercentBadge}><Text style={styles.progressPercent}>{percentFunded(selectedCampaign)}%</Text></View>
          </View>
          <ProgressBar value={percentFunded(selectedCampaign)} />
          <View style={styles.progressBottomline}>
            <View><Text style={styles.statLabel}>EST. REACH AT GOAL</Text><Text style={styles.statValue}>~{selectedCampaign.reachAtGoal.toLocaleString()} people</Text></View>
            <View style={{ alignItems: 'flex-end' }}><Text style={styles.statLabel}>TIME LEFT</Text><Text style={styles.statValue}>{selectedCampaign.daysLeft} days</Text></View>
          </View>
          <Text style={styles.miniDisclosure}>Reach is a planning estimate based on about $1 per 27 people. Actual results vary.</Text>
          {selectedCampaign.status === 'Funding open' ? <Button title="Back this campaign" onPress={() => beginContribution(selectedCampaign)} style={{ marginTop: 16 }} /> : <View style={styles.goalReachedNotice}><Text style={styles.goalReachedText}>Funding goal reached. Distribution begins only after approval and setup.</Text></View>}
        </View>

        <View style={styles.storySection}>
          <Text style={styles.sectionEyebrow}>THE STORY</Text>
          {selectedCampaign.story.map((block, index) => (
            <View key={`${block.heading}-${index}`} style={{ marginTop: index === 0 ? 8 : 18 }}>
              <Text style={styles.storyHeading}>{block.heading}</Text>
              <Text style={styles.storyText}>{block.text}</Text>
            </View>
          ))}
          {selectedCampaign.sources.length > 0 && (
            <View style={styles.sourcesBlock}>
              <View style={styles.sectionTitleRow}><Text style={styles.cardSectionTitle}>Supporting sources</Text><Text style={styles.sourceCount}>{selectedCampaign.sources.length} LINKS</Text></View>
              <Text style={styles.sourceIntro}>Explore the material the creator included. Sources are public on this campaign page.</Text>
              {sourceRows(selectedCampaign.sources)}
            </View>
          )}
        </View>

        <View style={styles.audiencePanel}>
          <Text style={styles.sectionEyebrow}>WHO THIS MESSAGE HOPES TO REACH</Text>
          <Text style={styles.audienceTitle}>{selectedCampaign.intendedAudience}</Text>
          <Text style={styles.audienceMeta}>⌖  {selectedCampaign.location}</Text>
          <View style={styles.channelRow}>{selectedCampaign.channels.map((channel) => <Tag key={channel} label={channel} />)}</View>
        </View>

        <View style={styles.detailVisualCard}>
          <Text style={styles.sectionEyebrow}>AD PREVIEW</Text>
          <Image source={{ uri: selectedCampaign.adImageUrl }} style={styles.adPreviewImage} />
          <Text style={styles.adPreviewHeadline}>{selectedCampaign.adHeadline}</Text>
          <Text style={styles.bodyMuted}>{selectedCampaign.adDescription}</Text>
          <View style={styles.adCta}><Text style={styles.adCtaText}>{selectedCampaign.callToAction}  ↗</Text></View>
        </View>

        <Pressable style={styles.expandableHeader} onPress={() => setShowUseOfFunds((current) => !current)} accessibilityRole="button">
          <View><Text style={styles.cardSectionTitle}>Where the contribution goes</Text><Text style={styles.expandableSubtitle}>Fees, advertising and unused funds</Text></View>
          <Text style={styles.expandGlyph}>{showUseOfFunds ? '−' : '+'}</Text>
        </Pressable>
        {showUseOfFunds && (
          <View style={styles.fundsDetail}>
            <Text style={styles.fundsLead}>Your contribution supports distribution of this message. It does not directly fund the cause or organization described in the story.</Text>
            <FeeRow label="Campaign promotion" value="About 97%" />
            <FeeRow label="Platform & payment fee" value="3% demo estimate" />
            <Text style={styles.fundsBody}>Approved funds are managed for promotion. Unspent funds follow the campaign’s disclosed refund policy after the funding period. This prototype does not move real money.</Text>
          </View>
        )}

        <View style={styles.reviewBox}>
          <View style={styles.reviewSeal}><Text style={styles.reviewSealText}>✓</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.reviewTitle}>Review is part of the journey</Text><Text style={styles.bodyMuted}>{selectedCampaign.status === 'In review' ? 'This creator submission is awaiting platform review.' : 'Campaign eligibility, story sources and advertising setup are reviewed before distribution.'}</Text></View>
        </View>

        <View style={styles.feedbackBox}>
          <Text style={styles.cardSectionTitle}>Did this visual help you keep reading?</Text>
          <Text style={styles.bodyMuted}>Your feedback helps creators improve how stories travel.</Text>
          {feedback ? <Text style={styles.feedbackThanks}>Thanks for sharing: {feedback.toLowerCase()}.</Text> : <View style={styles.feedbackActions}>{['No', 'Somewhat', 'Yes'].map((answer) => <ChoiceChip key={answer} label={answer} selected={false} onPress={() => { setFeedback(answer); showToast('Feedback saved for this demo.'); }} />)}</View>}
        </View>
      </View>
    </>
  );

  const renderContribute = () => {
    const chosen = customAmount.trim() ? Number(customAmount) : contributionAmount;
    const safeAmount = Number.isFinite(chosen) ? Math.max(0, chosen) : 0;
    const fee = Math.round(safeAmount * PLATFORM_FEE_RATE * 100) / 100;
    const paymentTotal = safeAmount + fee;
    return (
      <>
        <FlowHeader title="Back this campaign" subtitle={selectedCampaign.title} onBack={() => setRoute('detail')} />
        <View style={styles.contributionSteps}><FlowDot active={contributionStep >= 0} label="Amount" /><FlowLine active={contributionStep >= 1} /><FlowDot active={contributionStep >= 1} label="Review" /><FlowLine active={false} /><FlowDot active={false} label="Done" /></View>
        {contributionStep === 0 ? (
          <View style={styles.flowCard}>
            <Text style={styles.flowTitle}>Choose your contribution</Text>
            <Text style={styles.bodyMuted}>Every amount helps the campaign message reach people beyond the creator’s current network.</Text>
            <View style={styles.amountGrid}>
              {[10, 25, 50, 100].map((amount) => <AmountOption key={amount} amount={amount} selected={!customAmount && contributionAmount === amount} onPress={() => { setContributionAmount(amount); setCustomAmount(''); }} />)}
            </View>
            <Field label="Choose another amount" value={customAmount} onChangeText={(value) => { setCustomAmount(value.replace(/[^0-9.]/g, '')); if (value) setContributionAmount(Number(value) || 0); }} placeholder="Enter an amount" keyboardType="decimal-pad" leading="$" />
            <View style={styles.reachEstimateBox}>
              <View style={styles.reachEstimateIcon}><Text style={styles.reachEstimateIconText}>↗</Text></View>
              <View style={{ flex: 1 }}><Text style={styles.reachEstimateTitle}>About {estimateReach(safeAmount).toLocaleString()} people reached</Text><Text style={styles.bodyMuted}>A planning estimate from the campaign’s current model.</Text></View>
            </View>
            <View style={styles.truthInline}><Text style={styles.truthInlineIcon}>i</Text><Text style={styles.truthInlineText}>This supports message distribution, not a donation to the cause.</Text></View>
            <Button title="Review contribution" onPress={() => {
              if (safeAmount < 1) { showToast('Choose a contribution of at least $1.'); return; }
              setContributionAmount(safeAmount);
              setCustomAmount('');
              setContributionStep(1);
            }} style={{ marginTop: 20 }} />
            <Text style={styles.demoCheckoutLabel}>GUEST CHECKOUT · SIMULATED PAYMENT</Text>
          </View>
        ) : (
          <View style={styles.flowCard}>
            <Text style={styles.flowTitle}>Review the details</Text>
            <Text style={styles.bodyMuted}>A clear look at what you’re contributing and how it is used.</Text>
            <View style={styles.checkoutCampaignRow}><Image source={{ uri: selectedCampaign.coverUrl }} style={styles.checkoutThumb} /><View style={{ flex: 1 }}><Text numberOfLines={2} style={styles.checkoutCampaignTitle}>{selectedCampaign.title}</Text><Text style={styles.savedMeta}>Campaign amplification</Text></View></View>
            <FeeRow label="Your contribution" value={money(safeAmount)} />
            <FeeRow label="Platform & payment fee · 3% demo" value={preciseMoney(fee)} />
            <View style={styles.checkoutDivider} />
            <FeeRow label="Total simulated payment" value={preciseMoney(paymentTotal)} strong />
            <View style={styles.checkoutReach}>
              <Text style={styles.statLabel}>ESTIMATED REACH FROM THIS CONTRIBUTION</Text>
              <Text style={styles.checkoutReachNumber}>~{estimateReach(safeAmount).toLocaleString()} people</Text>
              <Text style={styles.miniDisclosure}>Estimate only; audience delivery depends on final campaign setup and advertising conditions.</Text>
            </View>
            <View style={styles.truthInline}><Text style={styles.truthInlineIcon}>i</Text><Text style={styles.truthInlineText}>This demo does not charge a card or transfer funds. Your support pays for the message’s reach.</Text></View>
            <Button title="Complete demo contribution" onPress={() => completeContribution('completed')} style={{ marginTop: 20 }} />
            <Button title="Simulate a failed payment" onPress={() => completeContribution('failed')} variant="ghost" />
            <Pressable onPress={() => setContributionStep(0)} style={styles.backLink}><Text style={styles.backLinkText}>‹  Change amount</Text></Pressable>
            <Text style={styles.demoCheckoutLabel}>SIMULATED CHECKOUT · NO REAL PAYMENT</Text>
          </View>
        )}
      </>
    );
  };

  const renderReceipt = () => {
    const lastAttempt = contributions[0];
    const succeeded = contributionResult === 'success';
    return (
      <View style={styles.receiptScreen}>
        <View style={[styles.receiptIcon, !succeeded && styles.receiptIconFailed]}><Text style={styles.receiptIconText}>{succeeded ? '✓' : '!'}</Text></View>
        <Text style={styles.eyebrow}>{succeeded ? 'DEMO PAYMENT COMPLETE' : 'PAYMENT NOT COMPLETED'}</Text>
        <Text style={styles.receiptTitle}>{succeeded ? 'You helped this message travel.' : 'Nothing was charged.'}</Text>
        <Text style={styles.receiptSubtitle}>{succeeded ? 'Your contribution is reflected in the campaign’s demo progress.' : 'The simulated payment failed. You can try again whenever you’re ready.'}</Text>
        {succeeded && lastAttempt && (
          <View style={styles.receiptCard}>
            <FeeRow label="Campaign" value="" />
            <Text style={styles.receiptCampaign}>{selectedCampaign.title}</Text>
            <FeeRow label="Contribution to promotion" value={money(lastAttempt.amount)} />
            <FeeRow label="Demo platform & payment fee" value={preciseMoney(lastAttempt.fee)} />
            <View style={styles.checkoutDivider} />
            <FeeRow label="Receipt" value={`#${lastAttempt.id.slice(-8).toUpperCase()}`} />
            <Text style={styles.miniDisclosure}>No real payment was processed. This receipt is stored on this device.</Text>
          </View>
        )}
        {!succeeded && <View style={styles.failedNote}><Text style={styles.failedNoteText}>Your contribution was not added to campaign funding. No funds moved.</Text></View>}
        <Button title={succeeded ? 'Track this campaign' : 'Try again'} onPress={() => {
          if (!succeeded) { setContributionStep(1); setRoute('contribute'); }
          else { setRoute('detail'); }
        }} style={{ width: '100%', marginTop: 10 }} />
        {succeeded && <Button title="Share campaign" onPress={() => shareCampaign(selectedCampaign)} variant="secondary" style={{ width: '100%' }} />}
        <Pressable onPress={() => navigate('Profile')} style={styles.backLink}><Text style={styles.backLinkText}>Go to your profile</Text></Pressable>
      </View>
    );
  };

  const renderSubmitted = () => (
    <View style={styles.submittedScreen}>
      <View style={styles.submittedIcon}><Text style={styles.submittedIconText}>✓</Text></View>
      <Text style={styles.eyebrow}>SUBMITTED FOR REVIEW</Text>
      <Text style={styles.submittedTitle}>Your story is in good hands.</Text>
      <Text style={styles.submittedSubtitle}>We’ve saved your campaign and added it to your dashboard. Here’s what happens next.</Text>
      <View style={styles.timelineCard}>
        <TimelineItem done title="Draft saved" body="Your campaign details are stored on this device." />
        <TimelineItem done title="Sent for review" body="The review team checks the story, sources, creative and audience plan." />
        <TimelineItem title="Review update" body="We’ll let you know if the campaign is approved or needs edits." last />
      </View>
      <View style={styles.truthInline}><Text style={styles.truthInlineIcon}>i</Text><Text style={styles.truthInlineText}>Campaigns are not published or promoted until required reviews and distribution setup are complete.</Text></View>
      <Button title="View creator dashboard" onPress={() => { setRoute('tabs'); setActiveTab('Profile'); setDashboardFilter('All'); }} style={{ width: '100%', marginTop: 22 }} />
      <Pressable onPress={() => openCampaign(selectedCampaign)} style={styles.backLink}><Text style={styles.backLinkText}>Preview submitted campaign</Text></Pressable>
    </View>
  );

  const renderCreate = () => (
    <View>
      <View style={styles.createHeading}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>YOUR STORY, STEP {step + 1} OF 5</Text>
          <Text style={styles.createTitle}>Create a campaign</Text>
        </View>
        <Pressable onPress={saveDraft} style={styles.saveDraftButton} accessibilityRole="button"><Text style={styles.saveDraftGlyph}>✓</Text><Text style={styles.saveDraftText}>Auto-saved</Text></Pressable>
      </View>
      <View style={styles.stepper}>
        {['Basics', 'Story', 'Visuals', 'Reach', 'Submit'].map((label, index) => (
          <Pressable key={label} style={styles.stepperItem} onPress={() => { if (index < step) { setStep(index); setFormError(''); } }} accessibilityRole="button" accessibilityLabel={`Step ${index + 1}: ${label}${step === index ? ', current step' : ''}`}>
            <View style={[styles.stepperLine, index < step ? styles.stepperLineDone : index === step ? styles.stepperLineCurrent : null]} />
            <Text style={[styles.stepperLabel, index === step && styles.stepperLabelCurrent, index < step && styles.stepperLabelDone]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.autosaveNote}>Your changes save automatically on this device. You can pause and return later.</Text>

      {step === 0 && (
        <>
          <View style={styles.voiceDemoCard}>
            <View style={styles.voiceIcon}><Text style={styles.voiceIconText}>◖</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.voiceTitle}>Prefer to talk it through?</Text><Text style={styles.voiceBody}>Try a voice-assisted demo draft. Everything it fills stays editable.</Text></View>
            <Pressable style={styles.voiceButton} onPress={fillVoiceDemo} accessibilityRole="button"><Text style={styles.voiceButtonText}>Try demo</Text></Pressable>
          </View>
          <View style={styles.assistRow}><Text style={styles.sectionEyebrow}>START WITH THE BASICS</Text><Pressable onPress={fillAssistDemo}><Text style={styles.inlineAction}>✦ Demo assist</Text></Pressable></View>
          <Field label="Campaign title *" value={draft.title} onChangeText={(value) => updateDraft('title', value)} placeholder="What should people remember?" maxLength={60} />
          <Text style={styles.characterCount}>{draft.title.length}/60 characters · The opening can become your ad headline.</Text>
          <Text style={styles.fieldLabel}>Category *</Text>
          <View style={styles.categoryGrid}>{CATEGORIES.map((category) => <ChoiceChip key={category} label={category} selected={draft.category === category} onPress={() => updateDraft('category', category)} compact />)}</View>
          <Field label="Creator or organization *" value={draft.creator} onChangeText={(value) => updateDraft('creator', value)} placeholder="Name shown on the campaign" />
          <Field label="Short summary *" value={draft.summary} onChangeText={(value) => updateDraft('summary', value)} placeholder="Give people a clear reason to keep reading." multiline maxLength={180} />
          <Text style={styles.characterCount}>{draft.summary.length}/180 characters</Text>
          <ImagePickerField label="Campaign cover (optional)" uri={draft.coverUri} onPress={() => pickImage('coverUri')} />
        </>
      )}

      {step === 1 && (
        <>
          <Text style={styles.stepIntro}>Write a clear story, not a complicated business form. Your sources will stay visible to everyone who reads the campaign.</Text>
          <Field label="Story headline *" value={draft.storyHeadline} onChangeText={(value) => updateDraft('storyHeadline', value)} placeholder="The heart of the story" />
          <Field label="Introduction *" value={draft.introduction} onChangeText={(value) => updateDraft('introduction', value)} placeholder="Set the scene in a few clear sentences." multiline />
          <Field label="Story and context *" value={draft.storyBody} onChangeText={(value) => updateDraft('storyBody', value)} placeholder="What is happening? Why does it matter? What should readers understand?" multiline tall />
          <View style={styles.sourcesHeading}><View><Text style={styles.fieldLabel}>Supporting sources *</Text><Text style={styles.fieldHint}>Use links readers can open and assess for themselves.</Text></View><Pressable onPress={addSource} style={styles.addSourceButton}><Text style={styles.addSourceText}>＋ Add source</Text></Pressable></View>
          {draft.sources.map((source, index) => (
            <View key={`source-${index}`} style={styles.sourceEditor}>
              <View style={styles.sourceEditorHeading}><Text style={styles.sourceEditorLabel}>SOURCE {String(index + 1).padStart(2, '0')}</Text>{draft.sources.length > 1 && <Pressable onPress={() => removeSource(index)}><Text style={styles.removeSource}>Remove</Text></Pressable>}</View>
              <Field label="Source title" value={source.title} onChangeText={(value) => updateSource(index, 'title', value)} placeholder="Report, article or dataset" compactField />
              <Field label="Publisher" value={source.publisher} onChangeText={(value) => updateSource(index, 'publisher', value)} placeholder="Organization or publication" compactField />
              <Field label="Link" value={source.url} onChangeText={(value) => updateSource(index, 'url', value)} placeholder="https://" keyboardType="url" autoCapitalize="none" compactField />
            </View>
          ))}
          <Field label="Suggested audience action" value={draft.audienceAction} onChangeText={(value) => updateDraft('audienceAction', value)} placeholder="What could an interested reader do next?" />
        </>
      )}

      {step === 2 && (
        <>
          <Text style={styles.stepIntro}>Your editorial story and the visuals used to advertise it serve different purposes. Add a cover, then shape the short message people may see in an ad.</Text>
          <ImagePickerField label="Campaign cover" uri={draft.coverUri} onPress={() => pickImage('coverUri')} />
          <ImagePickerField label="Advertising visual" uri={draft.adImageUri} onPress={() => pickImage('adImageUri')} />
          {!draft.adImageUri && !draft.coverUri && <View style={styles.warningNote}><Text style={styles.warningIcon}>!</Text><Text style={styles.warningText}>No image selected yet. Add a visual before submitting for a stronger campaign preview.</Text></View>}
          <Field label="Ad headline *" value={draft.adHeadline} onChangeText={(value) => updateDraft('adHeadline', value)} placeholder={draft.title || 'A short, clear headline'} maxLength={80} />
          <Field label="Ad description *" value={draft.adDescription} onChangeText={(value) => updateDraft('adDescription', value)} placeholder="One line of helpful context" multiline maxLength={180} />
          <Text style={styles.fieldLabel}>Call to action</Text>
          <View style={styles.categoryGrid}>{['Learn more', 'Read the story', 'Explore the issue', 'See the plan'].map((label) => <ChoiceChip key={label} label={label} selected={draft.callToAction === label} onPress={() => updateDraft('callToAction', label)} compact />)}</View>
          <View style={styles.adMock}>
            <Text style={styles.sectionEyebrow}>PLACEMENT PREVIEW · DEMO</Text>
            <View style={styles.adMockHeader}><View style={styles.adMockAvatar}><Text style={styles.adMockAvatarText}>{draft.creator.slice(0, 1) || 'A'}</Text></View><Text style={styles.adMockBrand}>{draft.creator || 'Your organization'} · Sponsored</Text></View>
            <ImageBackground source={{ uri: draft.adImageUri || draft.coverUri || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=85' }} style={styles.adMockImage} imageStyle={styles.adMockImageStyle}><View style={styles.adMockImageOverlay}><Text style={styles.adMockImageLabel}>{draft.adHeadline || draft.title || 'Your campaign headline'}</Text></View></ImageBackground>
            <Text style={styles.adMockDescription}>{draft.adDescription || draft.summary || 'Your short campaign description will appear here.'}</Text>
            <View style={styles.adMockCta}><Text style={styles.adMockCtaText}>{draft.callToAction}  ↗</Text></View>
          </View>
          <Text style={styles.fieldHint}>Uploads are only stored in this prototype session; a production app needs secure media storage and moderation.</Text>
        </>
      )}

      {step === 3 && (
        <>
          <Text style={styles.stepIntro}>Describe who you hope to reach and where the message may appear. The platform may refine settings during review; reach is never guaranteed.</Text>
          <Field label="Target location *" value={draft.location} onChangeText={(value) => updateDraft('location', value)} placeholder="City, region or country" leading="⌖" />
          <Field label="Audience characteristics *" value={draft.intendedAudience} onChangeText={(value) => updateDraft('intendedAudience', value)} placeholder="Who would benefit from seeing this message?" multiline />
          <Text style={styles.fieldLabel}>Distribution channels *</Text>
          <Text style={styles.fieldHint}>Choose where your message could appear. Final placements depend on review and availability.</Text>
          <View style={styles.channelChoices}>{['Social feeds', 'Search placements', 'Community newsletters', 'Local news placements'].map((channel) => <ChoiceChip key={channel} label={channel} selected={draft.channels.includes(channel)} onPress={() => toggleChannel(channel)} compact />)}</View>
          <View style={styles.reachPlanner}>
            <View style={styles.reachPlannerHeader}><View><Text style={styles.sectionEyebrow}>PLANNING ESTIMATE</Text><Text style={styles.reachPlannerTitle}>Shape the campaign pace</Text></View><View style={styles.plannerIcon}><Text style={styles.plannerIconText}>↗</Text></View></View>
            <View style={styles.plannerInputRow}><Field label="Daily budget" value={draft.dailyBudget} onChangeText={(value) => updateDraft('dailyBudget', value.replace(/[^0-9.]/g, ''))} placeholder="25" keyboardType="decimal-pad" leading="$" compactField /><Field label="Duration" value={draft.durationDays} onChangeText={(value) => updateDraft('durationDays', value.replace(/[^0-9]/g, ''))} placeholder="14" keyboardType="number-pad" trailing="days" compactField /></View>
            <Text style={styles.plannerDisclaimer}>You choose the initial plan. Review may adjust final distribution settings. This estimate is not a promise of audience size.</Text>
          </View>
          <View style={styles.audiencePreview}>
            <Text style={styles.sectionEyebrow}>AUDIENCE PREVIEW</Text>
            <Text style={styles.audiencePreviewTitle}>{draft.intendedAudience || 'Your intended audience'}</Text>
            <Text style={styles.audiencePreviewMeta}>⌖  {draft.location || 'Your selected location'}</Text>
            <View style={styles.channelRow}>{draft.channels.map((channel) => <Tag key={channel} label={channel} />)}</View>
            <Text style={styles.miniDisclosure}>These choices guide review; actual reach depends on inventory, delivery and performance.</Text>
          </View>
        </>
      )}

      {step === 4 && (
        <>
          <Text style={styles.stepIntro}>Review the full campaign as an audience member will see it. You set the funding goal here; it will never be silently generated or changed.</Text>
          <View style={styles.submissionPreview}>
            <ImageBackground source={{ uri: draft.coverUri || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=85' }} style={styles.submissionCover} imageStyle={styles.submissionCoverStyle}><Tag label={draft.category || 'Category'} light /></ImageBackground>
            <Text style={styles.submissionTitle}>{draft.title || 'Your campaign title'}</Text>
            <Text style={styles.submissionCreator}>By {draft.creator || 'Creator name'}</Text>
            <Text style={styles.submissionSummary}>{draft.summary || 'Your short summary will appear here.'}</Text>
            <View style={styles.previewDivider} />
            <Text style={styles.storyHeading}>{draft.storyHeadline || 'Story headline'}</Text>
            <Text style={styles.storyText}>{draft.introduction || 'Your introduction will appear here.'}</Text>
            <Text style={styles.storyText}>{draft.storyBody || 'Your story and context will appear here.'}</Text>
            <Text style={styles.fieldLabel}>Sources visible to readers</Text>
            {draft.sources.filter((source) => source.title.trim()).map((source, index) => <Text key={`${source.title}-${index}`} style={styles.previewSource}>↗  {source.title} · {source.publisher || 'Source'}</Text>)}
            <View style={styles.previewDivider} />
            <Text style={styles.sectionEyebrow}>ADVERTISING PREVIEW</Text>
            {draft.adImageUri || draft.coverUri ? <Image source={{ uri: draft.adImageUri || draft.coverUri }} style={styles.previewAdImage} /> : <View style={styles.previewNoImage}><Text style={styles.bodyMuted}>No advertising image selected</Text></View>}
            <Text style={styles.adPreviewHeadline}>{draft.adHeadline || draft.title || 'Campaign ad headline'}</Text>
            <Text style={styles.bodyMuted}>{draft.adDescription || draft.summary}</Text>
            <View style={styles.previewDivider} />
            <View style={styles.previewFactRow}><Text style={styles.previewFactLabel}>Intended audience</Text><Text style={styles.previewFactValue}>{draft.intendedAudience || '—'}</Text></View>
            <View style={styles.previewFactRow}><Text style={styles.previewFactLabel}>Location</Text><Text style={styles.previewFactValue}>{draft.location || '—'}</Text></View>
            <View style={styles.previewFactRow}><Text style={styles.previewFactLabel}>Channels</Text><Text style={styles.previewFactValue}>{draft.channels.join(', ') || '—'}</Text></View>
            <View style={styles.previewFactRow}><Text style={styles.previewFactLabel}>Daily budget</Text><Text style={styles.previewFactValue}>{money(Number(draft.dailyBudget) || 0)}</Text></View>
            <View style={styles.previewFactRow}><Text style={styles.previewFactLabel}>Duration</Text><Text style={styles.previewFactValue}>{draft.durationDays || 14} days</Text></View>
          </View>
          <Field label="Funding goal · set by you *" value={draft.fundingGoal} onChangeText={(value) => updateDraft('fundingGoal', value.replace(/[^0-9]/g, ''))} placeholder="For example, 8000" keyboardType="number-pad" leading="$" />
          <View style={styles.goalEstimate}><Text style={styles.goalEstimateLabel}>ESTIMATED REACH AT GOAL</Text><Text style={styles.goalEstimateValue}>~{estimateReach(Number(draft.fundingGoal) || 0).toLocaleString()} people</Text><Text style={styles.miniDisclosure}>Based on the configurable demo assumption of about $1 per 27 people. Actual reach varies.</Text></View>
          <View style={styles.feePolicyCard}><Text style={styles.cardSectionTitle}>Funding policy summary</Text><Text style={styles.fundsBody}>An estimated 3% platform and payment fee applies in this prototype; remaining funds support message promotion after approval. Unspent funds follow the campaign’s disclosed refund policy. This is not a direct donation.</Text></View>
          <Pressable style={styles.rulesCheck} onPress={() => updateDraft('rulesAccepted', !draft.rulesAccepted)} accessibilityRole="checkbox" accessibilityState={{ checked: draft.rulesAccepted }}>
            <View style={[styles.checkbox, draft.rulesAccepted && styles.checkboxChecked]}>{draft.rulesAccepted && <Text style={styles.checkboxMark}>✓</Text>}</View>
            <Text style={styles.rulesText}>I confirm this campaign follows the community guidelines and submission policies.</Text>
          </Pressable>
          <Button title="Open full preview" onPress={() => setShowPreview(true)} variant="secondary" style={{ marginTop: 12 }} />
        </>
      )}

      {formError ? <View style={styles.formErrorBox}><Text style={styles.formErrorIcon}>!</Text><Text style={styles.formErrorText}>{formError}</Text></View> : null}
      <View style={styles.wizardActions}>
        {step > 0 ? <Button title="Back" onPress={() => { setStep((current) => Math.max(0, current - 1)); setFormError(''); }} variant="secondary" style={{ flex: 1 }} /> : <Button title="Save draft" onPress={saveDraft} variant="secondary" style={{ flex: 1 }} />}
        {step < 4 ? <Button title="Continue" onPress={continueStep} style={{ flex: 1 }} /> : <Button title="Submit for review" onPress={submitCampaign} style={{ flex: 1 }} />}
      </View>
      <Text style={styles.wizardFooter}>Your campaign stays a draft until you choose to submit it for review.</Text>
    </View>
  );

  const renderBody = () => {
    if (route === 'detail') return renderDetail();
    if (route === 'create') return renderCreate();
    if (route === 'contribute') return renderContribute();
    if (route === 'receipt') return renderReceipt();
    if (route === 'submitted') return renderSubmitted();
    if (activeTab === 'Home') return renderHome();
    if (activeTab === 'Explore') return renderExplore();
    if (activeTab === 'Activity') return renderActivity();
    return renderProfile();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={styles.appShell} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.contentFrame}>
          <ScrollView ref={scrollRef} style={styles.mainScroll} contentContainerStyle={styles.mainScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {renderBody()}
          </ScrollView>
          <TabBar active={route === 'submitted' ? 'Profile' : route === 'create' ? 'Create' : activeTab} onSelect={navigate} unreadCount={unreadCount} />
          {toastVisible && <View style={styles.toast}><Text style={styles.toastCheck}>✓</Text><Text style={styles.toastText}>{toast}</Text></View>}
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showPreview} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPreview(false)}>
        <SafeAreaView style={styles.previewModalSafe}>
          <View style={styles.previewModalHeader}><Pressable onPress={() => setShowPreview(false)} style={styles.circleButton}><Text style={styles.closeGlyph}>×</Text></Pressable><Text style={styles.previewModalTitle}>Audience preview</Text><View style={{ width: 42 }} /></View>
          <ScrollView contentContainerStyle={styles.previewModalContent}>
            <ImageBackground source={{ uri: draft.coverUri || 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=85' }} style={styles.previewModalCover} imageStyle={styles.previewModalCoverImage}><Tag label={draft.category || 'Category'} light /></ImageBackground>
            <Text style={styles.submissionTitle}>{draft.title || 'Your campaign title'}</Text>
            <Text style={styles.submissionCreator}>By {draft.creator || 'Creator name'}</Text>
            <Text style={styles.submissionSummary}>{draft.summary || 'Your campaign summary will appear here.'}</Text>
            <View style={styles.progressPanel}><View style={styles.progressTopline}><View><Text style={styles.progressEyebrow}>FUNDING GOAL</Text><Text style={styles.progressRaised}>{money(Number(draft.fundingGoal) || 0)}</Text></View><View style={styles.progressPercentBadge}><Text style={styles.progressPercent}>0%</Text></View></View><ProgressBar value={0} /><Text style={styles.miniDisclosure}>~{estimateReach(Number(draft.fundingGoal) || 0).toLocaleString()} people estimated at goal · not guaranteed</Text></View>
            <Text style={styles.sectionEyebrow}>THE STORY</Text><Text style={styles.storyHeading}>{draft.storyHeadline || 'Story headline'}</Text><Text style={styles.storyText}>{draft.introduction || 'Your introduction will appear here.'}</Text><Text style={styles.storyText}>{draft.storyBody || 'Your story will appear here.'}</Text>
            <Text style={styles.cardSectionTitle}>Supporting sources</Text>{sourceRows(draft.sources.filter((source) => source.title.trim()))}
            <View style={styles.truthInline}><Text style={styles.truthInlineIcon}>i</Text><Text style={styles.truthInlineText}>Contributions support distribution of this message, not direct support for the cause.</Text></View>
          </ScrollView>
          <View style={styles.previewModalFooter}><Button title="Back to editing" onPress={() => setShowPreview(false)} style={{ width: '100%' }} /></View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeading({ eyebrow, title, action, onAction }: { eyebrow?: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionHeadingTitle}>{title}</Text>
      </View>
      {action && onAction ? <Pressable onPress={onAction} style={styles.headingAction}><Text style={styles.headingActionText}>{action}  →</Text></Pressable> : null}
    </View>
  );
}

function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  style,
  small = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'light' | 'heroGhost';
  icon?: string;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        variant === 'primary' && styles.buttonPrimary,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'light' && styles.buttonLight,
        variant === 'heroGhost' && styles.buttonHeroGhost,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
        style,
      ]}
    >
      {icon ? <Text style={[styles.buttonIcon, variant === 'light' && styles.buttonLightText]}>{icon}</Text> : null}
      <Text style={[
        styles.buttonText,
        small && styles.buttonTextSmall,
        variant === 'secondary' && styles.buttonSecondaryText,
        variant === 'ghost' && styles.buttonGhostText,
        variant === 'light' && styles.buttonLightText,
        variant === 'heroGhost' && styles.buttonHeroGhostText,
        disabled && styles.buttonDisabledText,
      ]}>{title}</Text>
    </Pressable>
  );
}

function Tag({ label, light = false }: { label: string; light?: boolean }) {
  return <View style={[styles.tag, light && styles.tagLight]}><Text style={[styles.tagText, light && styles.tagLightText]}>{label}</Text></View>;
}

function ChoiceChip({ label, selected, onPress, compact = false }: { label: string; selected: boolean; onPress: () => void; compact?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.choiceChip, compact && styles.choiceChipCompact, selected && styles.choiceChipSelected]}>
      {selected && <Text style={styles.choiceCheck}>✓</Text>}
      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function ProgressBar({ value }: { value: number }) {
  return <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(2, Math.min(100, value))}%` }]} /></View>;
}

function CampaignCard({
  campaign,
  onOpen,
  onBack,
  onSave,
  followed,
  compact = false,
}: {
  campaign: Campaign;
  onOpen: () => void;
  onBack: () => void;
  onSave: () => void;
  followed: boolean;
  compact?: boolean;
}) {
  return (
    <View style={[styles.campaignCard, compact && styles.campaignCardCompact]}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`Read ${campaign.title}`}>
        <ImageBackground source={{ uri: campaign.coverUrl }} style={[styles.campaignCardImage, compact && styles.campaignCardImageCompact]} imageStyle={styles.campaignCardImageStyle}>
          <View style={styles.campaignImageShade} />
          <View style={styles.campaignImageTop}><Tag label={campaign.category} light /><Pressable style={styles.cardSaveButton} onPress={onSave} accessibilityRole="button" accessibilityLabel={followed ? 'Remove saved campaign' : 'Save campaign'}><Text style={styles.cardSaveGlyph}>{followed ? '♥' : '♡'}</Text></Pressable></View>
          <View style={styles.campaignImageBottom}><Text style={styles.campaignImageEyebrow}>COMMUNITY CAMPAIGN</Text><Text style={styles.campaignImageCreator}>{campaign.creator}</Text></View>
        </ImageBackground>
        <View style={styles.campaignCardBody}>
          <Text numberOfLines={2} style={styles.campaignTitle}>{campaign.title}</Text>
          <Text numberOfLines={2} style={styles.campaignSummary}>{campaign.summary}</Text>
          <View style={styles.campaignProgressLine}><Text style={styles.campaignRaised}>{money(campaign.raised)} <Text style={styles.campaignOf}>of {money(campaign.goal)}</Text></Text><Text style={styles.campaignPercent}>{percentFunded(campaign)}%</Text></View>
          <ProgressBar value={percentFunded(campaign)} />
          <View style={styles.campaignCardMeta}><Text style={styles.campaignMetaText}>~{campaign.reachAtGoal.toLocaleString()} people at goal</Text><Text style={styles.campaignMetaText}>·  {campaign.daysLeft}d left</Text></View>
        </View>
      </Pressable>
      <View style={styles.campaignCardFooter}>
        <Button title={campaign.status === 'Funding goal reached' ? 'Goal reached' : 'Back this campaign'} onPress={onBack} small disabled={campaign.status === 'Funding goal reached'} style={{ flex: 1 }} />
        <Pressable onPress={onOpen} style={styles.cardReadMore}><Text style={styles.cardReadMoreText}>Read story</Text><Text style={styles.cardReadArrow}>↗</Text></Pressable>
      </View>
      {campaign.isDemo && <Text style={styles.cardDemoLabel}>DEMO FIGURES</Text>}
    </View>
  );
}

function StatusPill({ status }: { status: CampaignStatus }) {
  const tone = status === 'Funding open' || status === 'Approved' ? styles.statusGreen : status === 'In review' ? styles.statusAmber : status === 'Changes requested' ? styles.statusOrange : status === 'Completed' || status === 'Promoting' ? styles.statusBlue : styles.statusNeutral;
  return <View style={[styles.statusPill, tone]}><Text style={styles.statusPillText}>{status}</Text></View>;
}

function HowStep({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <View style={styles.howStep}>
      <Text style={styles.howNumber}>{number}</Text>
      <Text style={styles.howTitle}>{title}</Text>
      <Text style={styles.howBody}>{body}</Text>
    </View>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function CreatorCampaignRow({ campaign, onPress }: { campaign: Campaign; onPress: () => void }) {
  return (
    <Pressable style={styles.creatorCampaignRow} onPress={onPress} accessibilityRole="button">
      <Image source={{ uri: campaign.coverUrl }} style={styles.creatorCampaignImage} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={2} style={styles.creatorCampaignTitle}>{campaign.title}</Text>
        <View style={styles.creatorCampaignMetaRow}><StatusPill status={campaign.status} /><Text style={styles.creatorCampaignMeta}>{money(campaign.raised)} of {money(campaign.goal)}</Text></View>
        <ProgressBar value={percentFunded(campaign)} />
        <Text style={styles.creatorCampaignReach}>~{campaign.reachAtGoal.toLocaleString()} estimated people at goal</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  tall = false,
  maxLength,
  keyboardType = 'default',
  leading,
  trailing,
  autoCapitalize = 'sentences',
  compactField = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  tall?: boolean;
  maxLength?: number;
  keyboardType?: 'default' | 'decimal-pad' | 'number-pad' | 'url' | 'email-address';
  leading?: string;
  trailing?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  compactField?: boolean;
}) {
  return (
    <View style={[styles.fieldWrap, compactField && styles.fieldWrapCompact]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, multiline && styles.inputRowMultiline]}>
        {leading ? <Text style={styles.inputAffix}>{leading}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.quiet}
          multiline={multiline}
          maxLength={maxLength}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={keyboardType !== 'url'}
          style={[styles.textInput, multiline && styles.textInputMultiline, tall && styles.textInputTall]}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {trailing ? <Text style={styles.inputTrailing}>{trailing}</Text> : null}
      </View>
    </View>
  );
}

function ImagePickerField({ label, uri, onPress }: { label: string; uri: string; onPress: () => void }) {
  return (
    <View style={styles.imagePickerField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable onPress={onPress} style={styles.imagePickerButton} accessibilityRole="button">
        {uri ? <Image source={{ uri }} style={styles.imagePickerPreview} /> : <View style={styles.imagePickerPlaceholder}><Text style={styles.imagePickerGlyph}>＋</Text></View>}
        <View style={{ flex: 1 }}><Text style={styles.imagePickerTitle}>{uri ? 'Change image' : 'Choose from your photos'}</Text><Text style={styles.imagePickerSubtitle}>{uri ? 'Selected visual · tap to replace' : 'JPG or PNG · 4:3 works best'}</Text></View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </View>
  );
}

function FlowHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <View style={styles.flowHeader}>
      <Pressable onPress={onBack} style={styles.circleButton} accessibilityRole="button" accessibilityLabel="Back"><Text style={styles.backGlyphDark}>‹</Text></Pressable>
      <View style={{ flex: 1 }}><Text style={styles.flowHeaderTitle}>{title}</Text><Text numberOfLines={1} style={styles.flowHeaderSubtitle}>{subtitle}</Text></View>
      <View style={{ width: 42 }} />
    </View>
  );
}

function FlowDot({ active, label }: { active: boolean; label: string }) {
  return <View style={styles.flowDotBlock}><View style={[styles.flowDot, active && styles.flowDotActive]}>{active && <Text style={styles.flowDotCheck}>✓</Text>}</View><Text style={[styles.flowDotLabel, active && styles.flowDotLabelActive]}>{label}</Text></View>;
}

function FlowLine({ active }: { active: boolean }) { return <View style={[styles.flowLine, active && styles.flowLineActive]} />; }

function AmountOption({ amount, selected, onPress }: { amount: number; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.amountOption, selected && styles.amountOptionSelected]} accessibilityRole="radio" accessibilityState={{ selected }}><Text style={[styles.amountOptionValue, selected && styles.amountOptionValueSelected]}>{money(amount)}</Text><Text style={[styles.amountOptionCaption, selected && styles.amountOptionCaptionSelected]}>one-time</Text></Pressable>;
}

function FeeRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <View style={styles.feeRow}><Text style={[styles.feeLabel, strong && styles.feeStrong]}>{label}</Text>{value ? <Text style={[styles.feeValue, strong && styles.feeStrong]}>{value}</Text> : null}</View>;
}

function TimelineItem({ done = false, title, body, last = false }: { done?: boolean; title: string; body: string; last?: boolean }) {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineRail}><View style={[styles.timelineDot, done && styles.timelineDotDone]}>{done && <Text style={styles.timelineCheck}>✓</Text>}</View>{!last && <View style={styles.timelineLine} />}</View>
      <View style={styles.timelineText}><Text style={styles.timelineTitle}>{title}</Text><Text style={styles.timelineBody}>{body}</Text></View>
    </View>
  );
}

function TabBar({ active, onSelect, unreadCount }: { active: TabName; onSelect: (tab: TabName) => void; unreadCount: number }) {
  const tabs: Array<{ name: TabName; glyph: string }> = [
    { name: 'Home', glyph: '⌂' },
    { name: 'Explore', glyph: '⌕' },
    { name: 'Create', glyph: '＋' },
    { name: 'Activity', glyph: '◷' },
    { name: 'Profile', glyph: '○' },
  ];
  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <Pressable key={tab.name} onPress={() => onSelect(tab.name)} style={styles.tabButton} accessibilityRole="tab" accessibilityState={{ selected: active === tab.name }}>
          <View style={[styles.tabGlyphWrap, active === tab.name && styles.tabGlyphWrapActive]}><Text style={[styles.tabGlyph, active === tab.name && styles.tabGlyphActive]}>{tab.glyph}</Text>{tab.name === 'Activity' && unreadCount > 0 && <View style={styles.tabUnreadDot} />}</View>
          <Text style={[styles.tabLabel, active === tab.name && styles.tabLabelActive]}>{tab.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.paper },
  appShell: { flex: 1, backgroundColor: C.paper },
  contentFrame: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center' },
  mainScroll: { flex: 1 },
  mainScrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, gap: 12 },
  brandMark: { width: 56, height: 56, borderRadius: 19, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: C.leaf, fontSize: 36, fontWeight: '800', lineHeight: 40, fontStyle: 'italic' },
  brandName: { color: C.ink, fontSize: 25, fontWeight: '800', letterSpacing: -1.2 },
  brandHeader: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  brandLockup: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMarkSmall: { width: 32, height: 32, borderRadius: 11, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center' },
  brandMarkSmallText: { color: C.leaf, fontSize: 23, fontWeight: '800', lineHeight: 26, fontStyle: 'italic' },
  brandNameSmall: { color: C.ink, fontWeight: '800', fontSize: 21, letterSpacing: -0.9 },
  headerActivityButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  headerActivityGlyph: { color: C.ink, fontSize: 23, lineHeight: 27 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.orange, position: 'absolute', right: 8, top: 8 },
  bodyMuted: { color: C.muted, fontSize: 13, lineHeight: 20 },
  eyebrow: { color: C.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginBottom: 7 },
  eyebrowLight: { color: C.leafStrong, fontSize: 10, fontWeight: '800', letterSpacing: 1.3, marginBottom: 12 },
  homeHero: { minHeight: 436, backgroundColor: C.forest, borderRadius: 28, padding: 24, marginBottom: 31, overflow: 'hidden', justifyContent: 'flex-end' },
  heroArtwork: { position: 'absolute', right: -5, top: 0, width: 210, height: 185 },
  heroOrbLarge: { position: 'absolute', width: 182, height: 182, borderRadius: 91, right: -12, top: -32, backgroundColor: '#2A6652', opacity: 0.95 },
  heroOrbSmall: { position: 'absolute', width: 102, height: 102, borderRadius: 51, right: 30, top: 11, backgroundColor: C.leaf, opacity: 0.92 },
  heroSpark: { position: 'absolute', right: 139, top: 9, color: '#F6C782', fontSize: 29, fontWeight: '700' },
  heroArrow: { position: 'absolute', right: 58, top: 26, color: C.forest, fontSize: 45, fontWeight: '300', transform: [{ rotate: '8deg' }] },
  homeHeroTitle: { color: C.white, fontSize: 36, lineHeight: 40, letterSpacing: -1.8, fontWeight: '800', maxWidth: 355, marginBottom: 12 },
  homeHeroBody: { color: '#D7E5D9', fontSize: 15, lineHeight: 22, maxWidth: 390, marginBottom: 18 },
  heroEstimate: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#245A47', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, marginBottom: 16 },
  heroEstimateDot: { color: C.leafStrong, fontSize: 9 },
  heroEstimateText: { color: C.white, fontWeight: '700', fontSize: 12 },
  heroEstimateLabel: { color: C.leafStrong, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  heroActions: { flexDirection: 'row', gap: 9 },
  heroFootnote: { color: '#A9C3B1', fontSize: 10, marginTop: 10 },
  button: { minHeight: 50, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  buttonSmall: { minHeight: 39, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 9 },
  buttonPrimary: { backgroundColor: C.forest },
  buttonSecondary: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonLight: { backgroundColor: C.leaf },
  buttonHeroGhost: { backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  buttonDisabled: { backgroundColor: '#E2E7DF' },
  buttonPressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  buttonText: { color: C.white, fontSize: 14, fontWeight: '800', letterSpacing: 0.05 },
  buttonTextSmall: { fontSize: 12 },
  buttonSecondaryText: { color: C.forest },
  buttonGhostText: { color: C.forest },
  buttonLightText: { color: C.forestDeep },
  buttonHeroGhostText: { color: C.white },
  buttonDisabledText: { color: '#8A958B' },
  buttonIcon: { color: C.white, fontWeight: '800', fontSize: 18, lineHeight: 19 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 15, marginTop: 6 },
  sectionHeadingTitle: { color: C.ink, fontSize: 24, lineHeight: 29, fontWeight: '800', letterSpacing: -0.8 },
  headingAction: { paddingVertical: 7, paddingLeft: 6 },
  headingActionText: { color: C.forest, fontSize: 12, fontWeight: '800' },
  horizontalCards: { paddingBottom: 9, gap: 12, paddingRight: 8 },
  horizontalCardWrap: { width: 306 },
  campaignCard: { backgroundColor: C.white, borderRadius: 22, borderWidth: 1, borderColor: C.line, overflow: 'hidden', shadowColor: '#173B2D', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  campaignCardCompact: { borderRadius: 20 },
  campaignCardImage: { height: 158, justifyContent: 'space-between', padding: 13, backgroundColor: '#DCE6D9' },
  campaignCardImageCompact: { height: 148 },
  campaignCardImageStyle: { borderTopLeftRadius: 21, borderTopRightRadius: 21 },
  campaignImageShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,30,22,0.19)' },
  campaignImageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  campaignImageBottom: { gap: 2 },
  campaignImageEyebrow: { color: 'rgba(255,255,255,0.8)', fontSize: 8, fontWeight: '800', letterSpacing: 1.1 },
  campaignImageCreator: { color: C.white, fontSize: 13, fontWeight: '700' },
  tag: { backgroundColor: C.greenPale, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 18 },
  tagLight: { backgroundColor: 'rgba(255,255,255,0.92)' },
  tagText: { color: C.forest, fontSize: 10, fontWeight: '800' },
  tagLightText: { color: C.forestDeep },
  cardSaveButton: { height: 34, width: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.94)' },
  cardSaveGlyph: { color: C.forest, fontSize: 17 },
  campaignCardBody: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 13 },
  campaignTitle: { color: C.ink, fontSize: 18, lineHeight: 23, fontWeight: '800', letterSpacing: -0.4 },
  campaignSummary: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 6, minHeight: 36 },
  campaignProgressLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, marginBottom: 8 },
  campaignRaised: { color: C.ink, fontSize: 13, fontWeight: '800' },
  campaignOf: { color: C.muted, fontWeight: '500' },
  campaignPercent: { color: C.forest, fontSize: 11, fontWeight: '800' },
  progressTrack: { height: 7, backgroundColor: '#E9EDE5', borderRadius: 8, overflow: 'hidden' },
  progressFill: { height: 7, borderRadius: 8, backgroundColor: '#78A976' },
  campaignCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 },
  campaignMetaText: { color: C.muted, fontSize: 10, fontWeight: '600' },
  campaignCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingBottom: 15 },
  cardReadMore: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 8 },
  cardReadMoreText: { color: C.forest, fontSize: 11, fontWeight: '800' },
  cardReadArrow: { color: C.forest, fontWeight: '800' },
  cardDemoLabel: { position: 'absolute', right: 12, top: 113, backgroundColor: 'rgba(20,36,29,0.72)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4, color: C.white, fontSize: 7, fontWeight: '800', letterSpacing: 0.8 },
  howCard: { backgroundColor: C.white, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'stretch', marginBottom: 17 },
  howStep: { flex: 1, paddingVertical: 4 },
  howNumber: { color: '#99B283', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 9 },
  howTitle: { color: C.ink, fontSize: 16, fontWeight: '800', marginBottom: 6 },
  howBody: { color: C.muted, fontSize: 10, lineHeight: 15 },
  howDivider: { width: 1, backgroundColor: C.line, marginHorizontal: 12 },
  truthCard: { backgroundColor: '#ECF2E8', borderRadius: 19, padding: 16, flexDirection: 'row', gap: 12, marginBottom: 22 },
  truthIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center' },
  truthIconText: { color: C.white, fontSize: 15, fontWeight: '800' },
  truthTitle: { color: C.ink, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  truthBody: { color: C.muted, fontSize: 12, lineHeight: 18 },
  homeBottomCallout: { backgroundColor: '#E9F0E4', padding: 21, borderRadius: 22, marginTop: 5 },
  homeBottomTitle: { color: C.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.6, marginBottom: 5 },
  pageHeader: { marginTop: 12, marginBottom: 18 },
  pageTitle: { color: C.ink, fontSize: 34, lineHeight: 39, letterSpacing: -1.4, fontWeight: '800', marginBottom: 8 },
  pageSubtitle: { color: C.muted, fontSize: 14, lineHeight: 21 },
  searchBox: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.white, paddingHorizontal: 14, marginBottom: 14 },
  searchGlyph: { color: C.forest, fontSize: 25, width: 28, lineHeight: 29 },
  searchInput: { flex: 1, minHeight: 50, color: C.ink, fontSize: 13, paddingVertical: 0 },
  clearSearch: { color: C.muted, fontSize: 22, paddingHorizontal: 4 },
  chipRow: { flexDirection: 'row', gap: 8, paddingBottom: 8, paddingRight: 8 },
  choiceChip: { minHeight: 37, paddingHorizontal: 13, borderRadius: 20, backgroundColor: C.white, borderColor: C.line, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  choiceChipCompact: { minHeight: 34, paddingHorizontal: 11 },
  choiceChipSelected: { backgroundColor: C.forest, borderColor: C.forest },
  choiceCheck: { color: C.leafStrong, fontSize: 10, fontWeight: '800' },
  choiceChipText: { color: C.muted, fontSize: 11, fontWeight: '700' },
  choiceChipTextSelected: { color: C.white },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, marginBottom: 14 },
  resultsCount: { color: C.ink, fontSize: 13, fontWeight: '800' },
  sortPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: C.white, borderRadius: 13, borderWidth: 1, borderColor: C.line },
  sortLabel: { color: C.quiet, fontSize: 8, letterSpacing: 0.9, fontWeight: '800' },
  sortValue: { color: C.ink, fontSize: 10, fontWeight: '800' },
  emptyState: { alignItems: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 24, paddingHorizontal: 23, paddingVertical: 32, marginTop: 8 },
  emptyStateCompact: { alignItems: 'flex-start', backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 18, marginTop: 14 },
  emptyIllustration: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.greenPale, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyIllustrationText: { color: C.forest, fontSize: 29 },
  emptyTitle: { color: C.ink, fontSize: 17, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  emptyInline: { color: C.muted, fontSize: 12, lineHeight: 18, paddingVertical: 13 },
  titleWithAction: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  markReadButton: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: C.greenPale, borderRadius: 14 },
  markReadText: { color: C.forest, fontSize: 10, fontWeight: '800' },
  activityCard: { flexDirection: 'row', gap: 12, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 19, padding: 14, marginBottom: 10 },
  activityCardUnread: { borderColor: '#C9DCC1', backgroundColor: '#FBFDF9' },
  activityIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  activityIconMilestone: { backgroundColor: '#E3F0D3' },
  activityIconReview: { backgroundColor: '#FDF0D9' },
  activityIconDefault: { backgroundColor: '#E9EFEB' },
  activityGlyph: { color: C.forest, fontSize: 18, fontWeight: '800' },
  activityTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  activityTitle: { color: C.ink, fontSize: 13, lineHeight: 18, fontWeight: '800', flex: 1 },
  activityUnreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.orange, marginTop: 5 },
  activityBody: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 5 },
  activityTime: { color: C.quiet, fontSize: 9, fontWeight: '700', marginTop: 8 },
  profileHeader: { marginTop: 13, marginBottom: 24 },
  profileIdentity: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 7 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.forest, fontSize: 20, fontWeight: '800' },
  profileName: { color: C.ink, fontSize: 17, fontWeight: '800', marginBottom: 2 },
  guestBadge: { borderColor: '#DBE4D7', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
  guestBadgeText: { color: C.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  dashboardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 13 },
  dashboardTitle: { color: C.ink, fontSize: 21, fontWeight: '800', letterSpacing: -0.5 },
  dashboardSubtitle: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 3, maxWidth: 240 },
  metricStrip: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 13, marginBottom: 13 },
  metric: { flex: 1, alignItems: 'center', gap: 3 },
  metricValue: { color: C.forest, fontSize: 20, fontWeight: '800' },
  metricLabel: { color: C.quiet, fontSize: 7, letterSpacing: 0.9, fontWeight: '800' },
  metricDivider: { width: 1, height: 27, backgroundColor: C.line },
  creatorCampaignRow: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 11, marginBottom: 9 },
  creatorCampaignImage: { width: 66, height: 83, borderRadius: 13, backgroundColor: '#DFE8DD' },
  creatorCampaignTitle: { color: C.ink, fontWeight: '800', fontSize: 12, lineHeight: 16, marginBottom: 6 },
  creatorCampaignMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 6 },
  creatorCampaignMeta: { color: C.muted, fontSize: 9, fontWeight: '600' },
  creatorCampaignReach: { color: C.muted, fontSize: 9, marginTop: 6 },
  statusPill: { alignSelf: 'flex-start', borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4 },
  statusGreen: { backgroundColor: '#E6F1DA' },
  statusAmber: { backgroundColor: '#FFF2D9' },
  statusOrange: { backgroundColor: C.orangePale },
  statusBlue: { backgroundColor: '#E8EFF3' },
  statusNeutral: { backgroundColor: '#EFF0EC' },
  statusPillText: { color: C.forest, fontSize: 8, fontWeight: '800' },
  draftCard: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 14, backgroundColor: '#F2F6E9', borderRadius: 18, borderWidth: 1, borderColor: '#DCE7D0', marginTop: 5 },
  draftIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  draftIconText: { color: C.forest, fontSize: 17 },
  draftCardTitle: { color: C.ink, fontSize: 12, fontWeight: '800' },
  draftCardSubtitle: { color: C.muted, fontSize: 9, lineHeight: 13, marginTop: 4 },
  inlineAction: { color: C.forest, fontWeight: '800', fontSize: 10 },
  profileSectionCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 15, marginTop: 19 },
  cardSectionTitle: { color: C.ink, fontSize: 14, fontWeight: '800' },
  segmentRow: { flexDirection: 'row', backgroundColor: C.paper, borderRadius: 14, padding: 3, marginTop: 12, marginBottom: 9 },
  segment: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 11 },
  segmentActive: { backgroundColor: C.white, shadowColor: '#203C2E', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  segmentTextActive: { color: C.forest, fontWeight: '800' },
  savedCampaignList: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 5 },
  savedCampaignRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F2ED' },
  savedThumb: { width: 48, height: 48, borderRadius: 11, backgroundColor: '#E6EAE3' },
  savedTitle: { color: C.ink, fontSize: 11, lineHeight: 15, fontWeight: '800' },
  savedMeta: { color: C.muted, fontSize: 9, lineHeight: 14, marginTop: 3 },
  chevron: { color: '#93A095', fontSize: 22, lineHeight: 23 },
  paymentList: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0F2ED' },
  paymentStatusDot: { width: 9, height: 9, borderRadius: 5 },
  paymentComplete: { backgroundColor: '#79A975' },
  paymentFailed: { backgroundColor: C.orange },
  paymentAmount: { color: C.ink, fontWeight: '800', fontSize: 12 },
  helpCard: { backgroundColor: '#EAF0E6', padding: 18, borderRadius: 20, marginTop: 18 },
  helpTitle: { color: C.ink, fontSize: 20, letterSpacing: -0.6, fontWeight: '800', marginBottom: 5 },
  helpLinks: { marginTop: 12 },
  helpLink: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#D9E2D4' },
  helpLinkText: { color: C.forest, fontWeight: '800', fontSize: 12 },
  detailHeroWrap: { marginHorizontal: -20, marginTop: -12 },
  detailHero: { height: 315, justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, backgroundColor: '#DDE8DC' },
  detailHeroImage: { borderBottomLeftRadius: 27, borderBottomRightRadius: 27 },
  detailHeroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,34,26,0.28)' },
  detailHeroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  circleButtonLight: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  backGlyph: { color: C.ink, fontSize: 32, lineHeight: 34, marginTop: -3 },
  circleButtonGlyph: { color: C.forest, fontSize: 17, fontWeight: '800' },
  detailHeroBottom: { gap: 10, maxWidth: 500 },
  detailHeroTitle: { color: C.white, fontSize: 31, lineHeight: 35, fontWeight: '800', letterSpacing: -1.2, textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } },
  detailContent: { paddingTop: 17, paddingBottom: 35 },
  detailBylineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  creatorAvatar: { width: 39, height: 39, borderRadius: 14, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center' },
  creatorAvatarText: { color: C.forest, fontSize: 16, fontWeight: '800' },
  creatorName: { color: C.ink, fontSize: 12, fontWeight: '800' },
  creatorMeta: { color: C.muted, fontSize: 9, marginTop: 3 },
  detailLead: { color: C.ink, fontSize: 17, lineHeight: 25, fontWeight: '600', marginBottom: 9 },
  demoDataNote: { color: C.orange, fontSize: 8, fontWeight: '800', letterSpacing: 1, marginBottom: 14 },
  progressPanel: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 16, marginBottom: 26, shadowColor: '#234532', shadowOpacity: 0.04, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  progressTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressEyebrow: { color: C.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  progressRaised: { color: C.ink, fontSize: 23, fontWeight: '800', letterSpacing: -0.5 },
  progressGoal: { color: C.muted, fontWeight: '500', fontSize: 13, letterSpacing: 0 },
  progressPercentBadge: { backgroundColor: C.greenPale, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 13 },
  progressPercent: { color: C.forest, fontSize: 11, fontWeight: '800' },
  progressBottomline: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  statLabel: { color: C.quiet, fontSize: 7, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  statValue: { color: C.ink, fontSize: 11, fontWeight: '800' },
  miniDisclosure: { color: C.quiet, fontSize: 9, lineHeight: 14, marginTop: 8 },
  goalReachedNotice: { backgroundColor: '#F0F4EA', borderRadius: 13, padding: 12, marginTop: 13 },
  goalReachedText: { color: C.forest, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  storySection: { marginBottom: 23 },
  sectionEyebrow: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1.1, marginBottom: 7 },
  storyHeading: { color: C.ink, fontSize: 20, lineHeight: 25, fontWeight: '800', letterSpacing: -0.6, marginBottom: 7 },
  storyText: { color: '#4F5D54', fontSize: 14, lineHeight: 23, marginBottom: 9 },
  sourcesBlock: { marginTop: 15, padding: 14, backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.line },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
  sourceCount: { color: C.quiet, fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  sourceIntro: { color: C.muted, fontSize: 10, lineHeight: 15, marginBottom: 6 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#EFF1EC' },
  sourceIcon: { width: 29, height: 29, borderRadius: 10, backgroundColor: '#EDF2E9', alignItems: 'center', justifyContent: 'center' },
  sourceIconText: { color: C.forest, fontWeight: '800', fontSize: 13 },
  sourceTitle: { color: C.ink, fontSize: 10, lineHeight: 14, fontWeight: '800' },
  sourcePublisher: { color: C.muted, fontSize: 8, marginTop: 3 },
  audiencePanel: { backgroundColor: '#EAF1E7', padding: 17, borderRadius: 20, marginBottom: 17 },
  audienceTitle: { color: C.ink, fontSize: 17, lineHeight: 22, fontWeight: '800', marginBottom: 8 },
  audienceMeta: { color: C.muted, fontSize: 11, fontWeight: '700', marginBottom: 11 },
  channelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4 },
  detailVisualCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 15, marginBottom: 13 },
  adPreviewImage: { height: 145, width: '100%', borderRadius: 14, marginTop: 5, marginBottom: 11, backgroundColor: '#E5EBE2' },
  adPreviewHeadline: { color: C.ink, fontSize: 17, lineHeight: 21, fontWeight: '800', marginBottom: 5 },
  adCta: { alignSelf: 'flex-start', borderRadius: 12, backgroundColor: C.greenPale, paddingHorizontal: 10, paddingVertical: 7, marginTop: 12 },
  adCtaText: { color: C.forest, fontSize: 10, fontWeight: '800' },
  expandableHeader: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 17, padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 },
  expandableSubtitle: { color: C.muted, fontSize: 10, marginTop: 4 },
  expandGlyph: { color: C.forest, width: 28, height: 28, borderRadius: 14, backgroundColor: C.greenPale, textAlign: 'center', textAlignVertical: 'center', fontSize: 19, fontWeight: '500' },
  fundsDetail: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderTopWidth: 0, borderBottomLeftRadius: 17, borderBottomRightRadius: 17, padding: 15, marginBottom: 13 },
  fundsLead: { color: C.ink, fontSize: 12, lineHeight: 18, fontWeight: '700', marginBottom: 12 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center', paddingVertical: 8 },
  feeLabel: { color: C.muted, fontSize: 11, flex: 1 },
  feeValue: { color: C.ink, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  feeStrong: { color: C.ink, fontWeight: '800', fontSize: 13 },
  fundsBody: { color: C.muted, fontSize: 10, lineHeight: 16, marginTop: 8 },
  reviewBox: { backgroundColor: '#F1F5EF', borderRadius: 17, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 13, marginBottom: 13 },
  reviewSeal: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#D8E9D1', alignItems: 'center', justifyContent: 'center' },
  reviewSealText: { color: C.forest, fontWeight: '800', fontSize: 16 },
  reviewTitle: { color: C.ink, fontSize: 12, fontWeight: '800', marginBottom: 3 },
  feedbackBox: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 18, padding: 15, marginTop: 4 },
  feedbackActions: { flexDirection: 'row', gap: 7, marginTop: 13 },
  feedbackThanks: { color: C.forest, fontWeight: '800', fontSize: 11, marginTop: 13 },
  flowHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 7, marginBottom: 16 },
  circleButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: C.line, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  backGlyphDark: { color: C.ink, fontSize: 32, lineHeight: 35, marginTop: -2 },
  flowHeaderTitle: { color: C.ink, fontSize: 17, fontWeight: '800' },
  flowHeaderSubtitle: { color: C.muted, fontSize: 9, marginTop: 3 },
  contributionSteps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  flowDotBlock: { alignItems: 'center', gap: 5 },
  flowDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#C9D2C8', backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  flowDotActive: { borderColor: C.forest, backgroundColor: C.forest },
  flowDotCheck: { color: C.white, fontSize: 10, fontWeight: '800' },
  flowDotLabel: { color: C.quiet, fontSize: 8, fontWeight: '700' },
  flowDotLabelActive: { color: C.forest, fontWeight: '800' },
  flowLine: { height: 1, width: 42, backgroundColor: '#DDE2DA', marginHorizontal: 9, marginTop: -12 },
  flowLineActive: { backgroundColor: C.forest },
  flowCard: { backgroundColor: C.white, borderRadius: 22, borderWidth: 1, borderColor: C.line, padding: 18, marginBottom: 12 },
  flowTitle: { color: C.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.6, marginBottom: 5 },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 18, marginBottom: 16 },
  amountOption: { width: '48%', flexGrow: 1, minHeight: 71, borderWidth: 1, borderColor: C.line, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCFDFB' },
  amountOptionSelected: { borderColor: C.forest, backgroundColor: '#F0F6E8' },
  amountOptionValue: { color: C.ink, fontWeight: '800', fontSize: 18 },
  amountOptionValueSelected: { color: C.forest },
  amountOptionCaption: { color: C.quiet, fontSize: 8, fontWeight: '700', marginTop: 2 },
  amountOptionCaptionSelected: { color: C.forest },
  fieldWrap: { marginTop: 14 },
  fieldWrapCompact: { marginTop: 9, flex: 1, minWidth: '45%' },
  fieldLabel: { color: C.ink, fontSize: 11, fontWeight: '800', marginBottom: 7 },
  fieldHint: { color: C.muted, fontSize: 9, lineHeight: 14, marginTop: -2, marginBottom: 6 },
  inputRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FBFCFA', borderWidth: 1, borderColor: C.line, borderRadius: 13, paddingHorizontal: 12 },
  inputRowMultiline: { alignItems: 'flex-start', paddingTop: 4 },
  inputAffix: { color: C.muted, fontSize: 14, fontWeight: '700', marginRight: 7 },
  inputTrailing: { color: C.muted, fontSize: 10, fontWeight: '700', marginLeft: 5 },
  textInput: { flex: 1, minHeight: 44, color: C.ink, fontSize: 12, paddingVertical: 8 },
  textInputMultiline: { minHeight: 94, paddingTop: 8 },
  textInputTall: { minHeight: 152 },
  reachEstimateBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F0F5E9', padding: 13, borderRadius: 15, marginTop: 15 },
  reachEstimateIcon: { width: 33, height: 33, borderRadius: 12, backgroundColor: '#DDECCF', alignItems: 'center', justifyContent: 'center' },
  reachEstimateIconText: { color: C.forest, fontSize: 18, fontWeight: '800' },
  reachEstimateTitle: { color: C.ink, fontSize: 12, fontWeight: '800', marginBottom: 2 },
  truthInline: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 13, backgroundColor: '#F5F7F1', padding: 11, marginTop: 13 },
  truthInlineIcon: { color: C.forest, fontWeight: '800', fontSize: 12, width: 17, height: 17, textAlign: 'center', borderWidth: 1, borderColor: '#B8CDB2', borderRadius: 9, overflow: 'hidden' },
  truthInlineText: { color: C.muted, fontSize: 10, lineHeight: 15, flex: 1 },
  demoCheckoutLabel: { color: C.quiet, fontSize: 8, letterSpacing: 1.1, textAlign: 'center', marginTop: 14, fontWeight: '800' },
  checkoutCampaignRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.line, paddingVertical: 12, marginTop: 15, marginBottom: 7 },
  checkoutThumb: { width: 49, height: 49, borderRadius: 12, backgroundColor: '#E4E9E1' },
  checkoutCampaignTitle: { color: C.ink, fontSize: 11, lineHeight: 15, fontWeight: '800' },
  checkoutDivider: { height: 1, backgroundColor: C.line, marginVertical: 5 },
  checkoutReach: { alignItems: 'center', paddingVertical: 13, backgroundColor: '#F4F7F0', borderRadius: 15, marginTop: 9 },
  checkoutReachNumber: { color: C.forest, fontSize: 21, fontWeight: '800', marginTop: 1 },
  backLink: { alignSelf: 'center', paddingVertical: 14, paddingHorizontal: 12 },
  backLinkText: { color: C.forest, fontWeight: '800', fontSize: 11 },
  receiptScreen: { alignItems: 'center', paddingTop: 29, paddingBottom: 35 },
  receiptIcon: { width: 68, height: 68, borderRadius: 26, backgroundColor: '#E2F0D5', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  receiptIconFailed: { backgroundColor: C.orangePale },
  receiptIconText: { color: C.forest, fontSize: 30, fontWeight: '800' },
  receiptTitle: { color: C.ink, fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -1.1, textAlign: 'center', maxWidth: 360, marginBottom: 8 },
  receiptSubtitle: { color: C.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 330, marginBottom: 18 },
  receiptCard: { alignSelf: 'stretch', backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 20, padding: 15, marginBottom: 14 },
  receiptCampaign: { color: C.ink, fontWeight: '800', fontSize: 12, marginTop: -6, marginBottom: 7 },
  failedNote: { alignSelf: 'stretch', backgroundColor: C.orangePale, borderRadius: 15, padding: 14, marginBottom: 12 },
  failedNoteText: { color: '#89503E', fontSize: 11, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  submittedScreen: { alignItems: 'center', paddingTop: 28, paddingBottom: 35 },
  submittedIcon: { width: 65, height: 65, borderRadius: 24, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center', marginBottom: 17 },
  submittedIconText: { color: C.leaf, fontSize: 30, fontWeight: '800' },
  submittedTitle: { color: C.ink, fontSize: 31, lineHeight: 35, fontWeight: '800', letterSpacing: -1.2, textAlign: 'center', maxWidth: 360, marginBottom: 8 },
  submittedSubtitle: { color: C.muted, fontSize: 13, lineHeight: 20, maxWidth: 350, textAlign: 'center', marginBottom: 18 },
  timelineCard: { alignSelf: 'stretch', borderRadius: 20, borderWidth: 1, borderColor: C.line, backgroundColor: C.white, paddingHorizontal: 15, paddingTop: 16, marginBottom: 13 },
  timelineItem: { flexDirection: 'row', minHeight: 69, gap: 11 },
  timelineRail: { width: 22, alignItems: 'center' },
  timelineDot: { height: 21, width: 21, borderRadius: 11, borderWidth: 1.5, borderColor: '#CDD7CD', alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, zIndex: 1 },
  timelineDotDone: { backgroundColor: C.forest, borderColor: C.forest },
  timelineCheck: { color: C.white, fontSize: 10, fontWeight: '800' },
  timelineLine: { position: 'absolute', top: 19, width: 1, height: 51, backgroundColor: '#DAE0D7' },
  timelineText: { flex: 1, paddingBottom: 12 },
  timelineTitle: { color: C.ink, fontWeight: '800', fontSize: 12, marginBottom: 3 },
  timelineBody: { color: C.muted, fontSize: 10, lineHeight: 15 },
  createHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 15, gap: 10 },
  createTitle: { color: C.ink, fontSize: 28, lineHeight: 32, fontWeight: '800', letterSpacing: -1 },
  saveDraftButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: '#EAF2E2', borderRadius: 12 },
  saveDraftGlyph: { color: C.forest, fontSize: 10, fontWeight: '800' },
  saveDraftText: { color: C.forest, fontSize: 8, fontWeight: '800' },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stepperItem: { flex: 1, paddingHorizontal: 2 },
  stepperLine: { height: 4, borderRadius: 2, backgroundColor: '#E3E8E1', marginBottom: 6 },
  stepperLineDone: { backgroundColor: '#7DAA75' },
  stepperLineCurrent: { backgroundColor: C.forest },
  stepperLabel: { color: C.quiet, fontSize: 8, fontWeight: '700', textAlign: 'center' },
  stepperLabelCurrent: { color: C.forest, fontWeight: '800' },
  stepperLabelDone: { color: '#60845E' },
  autosaveNote: { color: C.quiet, fontSize: 9, textAlign: 'center', marginBottom: 16 },
  voiceDemoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EAF1E5', borderRadius: 17, padding: 12, marginBottom: 17 },
  voiceIcon: { width: 34, height: 34, borderRadius: 13, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  voiceIconText: { color: C.forest, fontSize: 19, fontWeight: '800' },
  voiceTitle: { color: C.ink, fontSize: 11, fontWeight: '800', marginBottom: 2 },
  voiceBody: { color: C.muted, fontSize: 9, lineHeight: 13 },
  voiceButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 11, backgroundColor: C.forest },
  voiceButtonText: { color: C.white, fontSize: 9, fontWeight: '800' },
  assistRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  characterCount: { color: C.quiet, fontSize: 8, textAlign: 'right', marginTop: 5 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4, marginBottom: 3 },
  stepIntro: { color: C.muted, fontSize: 12, lineHeight: 19, marginBottom: 13 },
  sourcesHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 18, marginBottom: 6 },
  addSourceButton: { paddingVertical: 7, paddingHorizontal: 9, borderRadius: 10, backgroundColor: C.greenPale },
  addSourceText: { color: C.forest, fontSize: 9, fontWeight: '800' },
  sourceEditor: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingHorizontal: 12, paddingBottom: 12, marginTop: 8 },
  sourceEditorHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 11 },
  sourceEditorLabel: { color: C.quiet, fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  removeSource: { color: C.red, fontSize: 9, fontWeight: '700' },
  imagePickerField: { marginTop: 15 },
  imagePickerButton: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 9, borderRadius: 15, borderWidth: 1, borderStyle: 'dashed', borderColor: '#C8D2C6', backgroundColor: C.white },
  imagePickerPreview: { width: 54, height: 48, borderRadius: 10, backgroundColor: '#E4E9E1' },
  imagePickerPlaceholder: { width: 54, height: 48, borderRadius: 10, backgroundColor: '#EFF3EC', alignItems: 'center', justifyContent: 'center' },
  imagePickerGlyph: { color: C.forest, fontSize: 24, fontWeight: '300' },
  imagePickerTitle: { color: C.forest, fontSize: 10, fontWeight: '800' },
  imagePickerSubtitle: { color: C.muted, fontSize: 8, marginTop: 3 },
  warningNote: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, backgroundColor: '#FFF3DF', padding: 11, marginTop: 13 },
  warningIcon: { color: '#9D6E19', fontSize: 15, fontWeight: '800' },
  warningText: { color: '#80612B', fontSize: 9, lineHeight: 14, flex: 1 },
  adMock: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, borderRadius: 19, padding: 13, marginTop: 20 },
  adMockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, marginBottom: 9 },
  adMockAvatar: { width: 28, height: 28, borderRadius: 10, backgroundColor: C.leaf, alignItems: 'center', justifyContent: 'center' },
  adMockAvatarText: { color: C.forest, fontSize: 10, fontWeight: '800' },
  adMockBrand: { color: C.muted, fontSize: 9, fontWeight: '700' },
  adMockImage: { height: 155, justifyContent: 'flex-end', backgroundColor: '#DDE7DA' },
  adMockImageStyle: { borderRadius: 12 },
  adMockImageOverlay: { backgroundColor: 'rgba(15,38,27,0.42)', padding: 12, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  adMockImageLabel: { color: C.white, fontSize: 18, lineHeight: 23, fontWeight: '800' },
  adMockDescription: { color: C.muted, fontSize: 10, lineHeight: 16, marginTop: 8 },
  adMockCta: { alignSelf: 'flex-start', backgroundColor: C.greenPale, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginTop: 8 },
  adMockCtaText: { color: C.forest, fontWeight: '800', fontSize: 9 },
  channelChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4 },
  reachPlanner: { backgroundColor: C.white, borderRadius: 19, padding: 14, borderWidth: 1, borderColor: C.line, marginTop: 19 },
  reachPlannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reachPlannerTitle: { color: C.ink, fontSize: 16, fontWeight: '800' },
  plannerIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: C.greenPale, alignItems: 'center', justifyContent: 'center' },
  plannerIconText: { color: C.forest, fontSize: 20, fontWeight: '800' },
  plannerInputRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  plannerDisclaimer: { color: C.quiet, fontSize: 8, lineHeight: 13, marginTop: 10 },
  audiencePreview: { borderRadius: 17, backgroundColor: '#EAF1E7', padding: 14, marginTop: 15 },
  audiencePreviewTitle: { color: C.ink, fontSize: 14, lineHeight: 19, fontWeight: '800' },
  audiencePreviewMeta: { color: C.muted, fontSize: 10, marginTop: 4 },
  submissionPreview: { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 14 },
  submissionCover: { height: 160, justifyContent: 'flex-start', padding: 10, backgroundColor: '#DFE8DD' },
  submissionCoverStyle: { borderRadius: 14 },
  submissionTitle: { color: C.ink, fontSize: 21, lineHeight: 26, fontWeight: '800', letterSpacing: -0.7, marginTop: 12 },
  submissionCreator: { color: C.muted, fontSize: 10, fontWeight: '700', marginTop: 5 },
  submissionSummary: { color: '#536057', fontSize: 12, lineHeight: 18, marginTop: 9 },
  previewDivider: { height: 1, backgroundColor: C.line, marginVertical: 13 },
  previewSource: { color: C.forest, fontSize: 10, lineHeight: 16, marginTop: 5 },
  previewAdImage: { width: '100%', height: 130, borderRadius: 13, backgroundColor: '#E5EBE3', marginVertical: 8 },
  previewNoImage: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2F4F0', height: 70, borderRadius: 13, marginVertical: 8 },
  previewFactRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F0F2ED' },
  previewFactLabel: { color: C.muted, fontSize: 9, flex: 0.8 },
  previewFactValue: { color: C.ink, fontSize: 9, fontWeight: '700', flex: 1.2, textAlign: 'right' },
  goalEstimate: { backgroundColor: '#EDF4E8', borderRadius: 15, padding: 13, marginTop: 12 },
  goalEstimateLabel: { color: C.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.9 },
  goalEstimateValue: { color: C.forest, fontSize: 21, fontWeight: '800', marginTop: 2 },
  feePolicyCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.line, padding: 13, borderRadius: 15, marginTop: 12 },
  rulesCheck: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 14 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: '#B9C5B8', alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, marginTop: 1 },
  checkboxChecked: { backgroundColor: C.forest, borderColor: C.forest },
  checkboxMark: { color: C.white, fontSize: 11, fontWeight: '800' },
  rulesText: { color: C.ink, fontSize: 10, lineHeight: 16, flex: 1, fontWeight: '600' },
  formErrorBox: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#FFF0EA', borderRadius: 13, padding: 11, marginTop: 12 },
  formErrorIcon: { color: C.red, fontWeight: '800', fontSize: 13 },
  formErrorText: { color: '#9A4A3C', fontSize: 10, lineHeight: 15, flex: 1, fontWeight: '700' },
  wizardActions: { flexDirection: 'row', gap: 10, marginTop: 17 },
  wizardFooter: { color: C.quiet, fontSize: 8, lineHeight: 13, textAlign: 'center', marginTop: 11, marginBottom: 18 },
  previewModalSafe: { flex: 1, backgroundColor: C.paper },
  previewModalHeader: { minHeight: 55, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.line },
  closeGlyph: { color: C.ink, fontSize: 24, lineHeight: 27 },
  previewModalTitle: { color: C.ink, fontSize: 14, fontWeight: '800' },
  previewModalContent: { padding: 20, paddingBottom: 30 },
  previewModalCover: { height: 190, justifyContent: 'flex-start', padding: 12, backgroundColor: '#E1E8DE' },
  previewModalCoverImage: { borderRadius: 16 },
  previewModalFooter: { paddingHorizontal: 18, paddingVertical: 12, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line },
  tabBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', minHeight: 68, paddingTop: 5, paddingBottom: Platform.OS === 'ios' ? 8 : 7, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.white },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 55 },
  tabGlyphWrap: { height: 31, minWidth: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  tabGlyphWrapActive: { backgroundColor: '#E8F0E3' },
  tabGlyph: { color: C.muted, fontSize: 21, lineHeight: 24, fontWeight: '600' },
  tabGlyphActive: { color: C.forest, fontWeight: '800' },
  tabUnreadDot: { position: 'absolute', top: 3, right: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: C.orange },
  tabLabel: { color: C.muted, fontSize: 8, fontWeight: '700' },
  tabLabelActive: { color: C.forest, fontWeight: '800' },
  toast: { position: 'absolute', left: 16, right: 16, bottom: 76, backgroundColor: C.forestDeep, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', gap: 9, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  toastCheck: { color: C.leaf, fontWeight: '800', fontSize: 13 },
  toastText: { color: C.white, fontSize: 10, lineHeight: 15, fontWeight: '700', flex: 1 },
});

export default App;

