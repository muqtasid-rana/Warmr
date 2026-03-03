// ── Firestore Prospect Service ──────────────────────────────
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    writeBatch,
    getDocs,
} from 'firebase/firestore'
import { db } from './firebase'

const COLLECTION = 'prospects'
const prospectsRef = collection(db, COLLECTION)

// ── Helper: days-ago ISO string ────────────────────────────
function daysAgoISO(days) {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString()
}

// Today as YYYY-MM-DD
function todayStr() {
    return new Date().toISOString().slice(0, 10)
}

// ── Real-time subscription ─────────────────────────────────
export function subscribeToProspects(callback) {
    const q = query(prospectsRef, orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snapshot) => {
        const prospects = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        callback(prospects)
    })
}

// ── CRUD ────────────────────────────────────────────────────
export async function addProspect(data) {
    const now = new Date().toISOString()
    const prospect = {
        name: data.name || '',
        linkedin: data.linkedin || '',
        website: data.website || '',
        followers: data.followers || '',
        niche: data.niche || 'Business Coach',
        notes: data.notes || '',
        status: 'Warming',
        addedAt: now,
        createdAt: now,
        // New flow fields
        warmingDaysCompleted: 0,
        currentActionDueDate: todayStr(),
        dmSentAt: null,
        noReplyAt: null,
        followUpsDone: 0,
        lastFollowUpAt: null,
    }
    return addDoc(prospectsRef, prospect)
}

export async function updateProspect(id, data) {
    const ref = doc(db, COLLECTION, id)
    return updateDoc(ref, data)
}

export async function deleteProspect(id) {
    const ref = doc(db, COLLECTION, id)
    return deleteDoc(ref)
}

// ── Seed initial data (one-time) ────────────────────────────
// Call this once to populate the database with the 8 default prospects.
// After seeding, the function won't re-seed if prospects already exist.
let _seedingPromise = null
export function seedIfEmpty() {
    if (_seedingPromise) return _seedingPromise
    _seedingPromise = _doSeed()
    return _seedingPromise
}

async function _doSeed() {
    const snapshot = await getDocs(prospectsRef)
    if (snapshot.size > 0) return false // already seeded

    const today = todayStr()

    const seeds = [
        {
            name: 'Kimberly Hamilton',
            linkedin: '',
            website: '',
            followers: '11k',
            niche: 'Business Coach',
            status: 'Active Conversation',
            addedAt: daysAgoISO(8),
            createdAt: daysAgoISO(8),
            notes: '11k followers, nearly empty website. Highest priority.',
            warmingDaysCompleted: 7,
            currentActionDueDate: today,
            dmSentAt: daysAgoISO(1),
            noReplyAt: null,
            followUpsDone: 0,
            lastFollowUpAt: null,
        },
        {
            name: 'Flemming Johnson',
            linkedin: '',
            website: '',
            followers: '5k',
            niche: 'Executive Coach',
            status: 'Warming',
            addedAt: daysAgoISO(3),
            createdAt: daysAgoISO(3),
            notes: 'Big coach, bad headline, no trust infrastructure.',
            warmingDaysCompleted: 2,
            currentActionDueDate: today,
            dmSentAt: null,
            noReplyAt: null,
            followUpsDone: 0,
            lastFollowUpAt: null,
        },
        {
            name: 'Marcus Reid',
            linkedin: '',
            website: '',
            followers: '8k',
            niche: 'Sales Consultant',
            status: 'Loom Sent',
            addedAt: daysAgoISO(12),
            createdAt: daysAgoISO(12),
            notes: 'Sent Loom on Monday. Awaiting response.',
            warmingDaysCompleted: 7,
            currentActionDueDate: today,
            dmSentAt: daysAgoISO(5),
            noReplyAt: null,
            followUpsDone: 0,
            lastFollowUpAt: null,
        },
        {
            name: 'Sarah Chen',
            linkedin: '',
            website: '',
            followers: '3k',
            niche: 'Leadership Coach',
            status: 'Warming',
            addedAt: daysAgoISO(7),
            createdAt: daysAgoISO(7),
            notes: 'Posts daily. Warming complete.',
            warmingDaysCompleted: 7,
            currentActionDueDate: today,
            dmSentAt: null,
            noReplyAt: null,
            followUpsDone: 0,
            lastFollowUpAt: null,
        },
        {
            name: 'David Okafor',
            linkedin: '',
            website: '',
            followers: '6k',
            niche: 'Financial Coach',
            status: 'Warming',
            addedAt: daysAgoISO(2),
            createdAt: daysAgoISO(2),
            notes: 'Strong LinkedIn presence, outdated website.',
            warmingDaysCompleted: 1,
            currentActionDueDate: today,
            dmSentAt: null,
            noReplyAt: null,
            followUpsDone: 0,
            lastFollowUpAt: null,
        },
        {
            name: 'Priya Sharma',
            linkedin: '',
            website: '',
            followers: '14k',
            niche: 'Marketing Consultant',
            status: 'Active Conversation',
            addedAt: daysAgoISO(10),
            createdAt: daysAgoISO(10),
            notes: 'Very responsive. Interested in full funnel build.',
            warmingDaysCompleted: 7,
            currentActionDueDate: today,
            dmSentAt: daysAgoISO(3),
            noReplyAt: null,
            followUpsDone: 0,
            lastFollowUpAt: null,
        },
        {
            name: 'Jason Dukes',
            linkedin: '',
            website: '',
            followers: '3k',
            niche: 'Life Coach',
            status: 'Warming',
            addedAt: daysAgoISO(5),
            createdAt: daysAgoISO(5),
            notes: 'Posts every day. Site feels incomplete.',
            warmingDaysCompleted: 4,
            currentActionDueDate: today,
            dmSentAt: null,
            noReplyAt: null,
            followUpsDone: 0,
            lastFollowUpAt: null,
        },
        {
            name: 'Michael Clark',
            linkedin: '',
            website: '',
            followers: '3k',
            niche: 'Executive Coach',
            status: 'Client Won',
            addedAt: daysAgoISO(30),
            createdAt: daysAgoISO(30),
            notes: 'Closed at $6,500. Referral potential high.',
            warmingDaysCompleted: 7,
            currentActionDueDate: today,
            dmSentAt: daysAgoISO(23),
            noReplyAt: null,
            followUpsDone: 0,
            lastFollowUpAt: null,
        },
    ]

    const batch = writeBatch(db)
    seeds.forEach((seed) => {
        const ref = doc(prospectsRef)
        batch.set(ref, seed)
    })
    await batch.commit()
    return true
}
