"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeChatsSocket = void 0;
const boom_1 = require("@hapi/boom");
const WAProto_1 = require("../../WAProto");
const Utils_1 = require("../Utils");
const make_mutex_1 = require("../Utils/make-mutex");
const WABinary_1 = require("../WABinary");
const messages_send_1 = require("./messages-send");
const MAX_SYNC_ATTEMPTS = 5;
const makeChatsSocket = (config) => {
    const { logger } = config;
    const sock = messages_send_1.makeMessagesSocket(config);
    const { ev, ws, authState, generateMessageTag, sendNode, query, fetchPrivacySettings, onUnexpectedError, emitEventsFromMap, } = sock;
    const mutationMutex = make_mutex_1.makeMutex();
    /// helper function to fetch an app state sync key
    const getAppStateSyncKey = async (keyId) => {
        const { [keyId]: key } = await authState.keys.get('app-state-sync-key', [keyId]);
        return key;
    };
    const interactiveQuery = async (userNodes, queryNode) => {
        const result = await query({
            tag: 'iq',
            attrs: {
                to: WABinary_1.S_WHATSAPP_NET,
                type: 'get',
                xmlns: 'usync',
            },
            content: [
                {
                    tag: 'usync',
                    attrs: {
                        sid: generateMessageTag(),
                        mode: 'query',
                        last: 'true',
                        index: '0',
                        context: 'interactive',
                    },
                    content: [
                        {
                            tag: 'query',
                            attrs: {},
                            content: [queryNode]
                        },
                        {
                            tag: 'list',
                            attrs: {},
                            content: userNodes
                        }
                    ]
                }
            ],
        });
        const usyncNode = WABinary_1.getBinaryNodeChild(result, 'usync');
        const listNode = WABinary_1.getBinaryNodeChild(usyncNode, 'list');
        const users = WABinary_1.getBinaryNodeChildren(listNode, 'user');
        return users;
    };
    const onWhatsApp = async (...jids) => {
        const results = await interactiveQuery([
            {
                tag: 'user',
                attrs: {},
                content: jids.map(jid => ({
                    tag: 'contact',
                    attrs: {},
                    content: `+${jid}`
                }))
            }
        ], { tag: 'contact', attrs: {} });
        return results.map(user => {
            const contact = WABinary_1.getBinaryNodeChild(user, 'contact');
            return { exists: contact.attrs.type === 'in', jid: user.attrs.jid };
        }).filter(item => item.exists);
    };
    const fetchStatus = async (jid) => {
        const [result] = await interactiveQuery([{ tag: 'user', attrs: { jid } }], { tag: 'status', attrs: {} });
        if (result) {
            const status = WABinary_1.getBinaryNodeChild(result, 'status');
            return {
                status: status.content.toString(),
                setAt: new Date(+status.attrs.t * 1000)
            };
        }
    };
    const updateProfilePicture = async (jid, content) => {
        const { img } = await Utils_1.generateProfilePicture(content);
        await query({
            tag: 'iq',
            attrs: {
                to: WABinary_1.jidNormalizedUser(jid),
                type: 'set',
                xmlns: 'w:profile:picture'
            },
            content: [
                {
                    tag: 'picture',
                    attrs: { type: 'image' },
                    content: img
                }
            ]
        });
    };
    const fetchBlocklist = async () => {
        var _a, _b;
        const result = await query({
            tag: 'iq',
            attrs: {
                xmlns: 'blocklist',
                to: WABinary_1.S_WHATSAPP_NET,
                type: 'get'
            }
        });
        const child = (_a = result.content) === null || _a === void 0 ? void 0 : _a[0];
        return (_b = child.content) === null || _b === void 0 ? void 0 : _b.map(i => i.attrs.jid);
    };
    const updateBlockStatus = async (jid, action) => {
        await query({
            tag: 'iq',
            attrs: {
                xmlns: 'blocklist',
                to: WABinary_1.S_WHATSAPP_NET,
                type: 'set'
            },
            content: [
                {
                    tag: 'item',
                    attrs: {
                        action,
                        jid
                    }
                }
            ]
        });
    };
    const getBusinessProfile = async (jid) => {
        var _a, _b;
        const results = await query({
            tag: 'iq',
            attrs: {
                to: 's.whatsapp.net',
                xmlns: 'w:biz',
                type: 'get'
            },
            content: [{
                    tag: 'business_profile',
                    attrs: { v: '244' },
                    content: [{
                            tag: 'profile',
                            attrs: { jid }
                        }]
                }]
        });
        const profileNode = WABinary_1.getBinaryNodeChild(results, 'business_profile');
        const profiles = WABinary_1.getBinaryNodeChild(profileNode, 'profile');
        if (profiles) {
            const address = WABinary_1.getBinaryNodeChild(profiles, 'address');
            const description = WABinary_1.getBinaryNodeChild(profiles, 'description');
            const website = WABinary_1.getBinaryNodeChild(profiles, 'website');
            const email = WABinary_1.getBinaryNodeChild(profiles, 'email');
            const category = WABinary_1.getBinaryNodeChild(WABinary_1.getBinaryNodeChild(profiles, 'categories'), 'category');
            const business_hours = WABinary_1.getBinaryNodeChild(profiles, 'business_hours');
            const business_hours_config = business_hours && WABinary_1.getBinaryNodeChildren(business_hours, 'business_hours_config');
            return {
                wid: (_a = profiles.attrs) === null || _a === void 0 ? void 0 : _a.jid,
                address: address === null || address === void 0 ? void 0 : address.content.toString(),
                description: description === null || description === void 0 ? void 0 : description.content.toString(),
                website: [website === null || website === void 0 ? void 0 : website.content.toString()],
                email: email === null || email === void 0 ? void 0 : email.content.toString(),
                category: category === null || category === void 0 ? void 0 : category.content.toString(),
                business_hours: {
                    timezone: (_b = business_hours === null || business_hours === void 0 ? void 0 : business_hours.attrs) === null || _b === void 0 ? void 0 : _b.timezone,
                    business_config: business_hours_config === null || business_hours_config === void 0 ? void 0 : business_hours_config.map(({ attrs }) => attrs)
                }
            };
        }
    };
    const updateAccountSyncTimestamp = async (fromTimestamp) => {
        logger.info({ fromTimestamp }, 'requesting account sync');
        await sendNode({
            tag: 'iq',
            attrs: {
                to: WABinary_1.S_WHATSAPP_NET,
                type: 'set',
                xmlns: 'urn:xmpp:whatsapp:dirty',
                id: generateMessageTag(),
            },
            content: [
                {
                    tag: 'clean',
                    attrs: {
                        type: 'account_sync',
                        timestamp: fromTimestamp.toString(),
                    }
                }
            ]
        });
    };
    const resyncAppState = async (collections) => {
        const appStateChunk = { totalMutations: [], collectionsToHandle: [] };
        // we use this to determine which events to fire
        // otherwise when we resync from scratch -- all notifications will fire
        const initialVersionMap = {};
        await authState.keys.transaction(async () => {
            var _a;
            const collectionsToHandle = new Set(collections);
            // in case something goes wrong -- ensure we don't enter a loop that cannot be exited from
            const attemptsMap = {};
            // keep executing till all collections are done
            // sometimes a single patch request will not return all the patches (God knows why)
            // so we fetch till they're all done (this is determined by the "has_more_patches" flag)
            while (collectionsToHandle.size) {
                const states = {};
                const nodes = [];
                for (const name of collectionsToHandle) {
                    const result = await authState.keys.get('app-state-sync-version', [name]);
                    let state = result[name];
                    if (state) {
                        if (typeof initialVersionMap[name] === 'undefined') {
                            initialVersionMap[name] = state.version;
                        }
                    }
                    else {
                        state = Utils_1.newLTHashState();
                    }
                    states[name] = state;
                    logger.info(`resyncing ${name} from v${state.version}`);
                    nodes.push({
                        tag: 'collection',
                        attrs: {
                            name,
                            version: state.version.toString(),
                            // return snapshot if being synced from scratch
                            return_snapshot: (!state.version).toString()
                        }
                    });
                }
                const result = await query({
                    tag: 'iq',
                    attrs: {
                        to: WABinary_1.S_WHATSAPP_NET,
                        xmlns: 'w:sync:app:state',
                        type: 'set'
                    },
                    content: [
                        {
                            tag: 'sync',
                            attrs: {},
                            content: nodes
                        }
                    ]
                });
                const decoded = await Utils_1.extractSyncdPatches(result); // extract from binary node
                for (const key in decoded) {
                    const name = key;
                    const { patches, hasMorePatches, snapshot } = decoded[name];
                    try {
                        if (snapshot) {
                            const { state: newState, mutations } = await Utils_1.decodeSyncdSnapshot(name, snapshot, getAppStateSyncKey, initialVersionMap[name]);
                            states[name] = newState;
                            logger.info(`restored state of ${name} from snapshot to v${newState.version} with ${mutations.length} mutations`);
                            await authState.keys.set({ 'app-state-sync-version': { [name]: newState } });
                            appStateChunk.totalMutations.push(...mutations);
                        }
                        // only process if there are syncd patches
                        if (patches.length) {
                            const { newMutations, state: newState } = await Utils_1.decodePatches(name, patches, states[name], getAppStateSyncKey, initialVersionMap[name]);
                            await authState.keys.set({ 'app-state-sync-version': { [name]: newState } });
                            logger.info(`synced ${name} to v${newState.version}`);
                            if (newMutations.length) {
                                logger.trace({ newMutations, name }, 'recv new mutations');
                            }
                            appStateChunk.totalMutations.push(...newMutations);
                        }
                        if (hasMorePatches) {
                            logger.info(`${name} has more patches...`);
                        }
                        else { // collection is done with sync
                            collectionsToHandle.delete(name);
                        }
                    }
                    catch (error) {
                        logger.info({ name, error: error.stack }, 'failed to sync state from version, removing and trying from scratch');
                        await authState.keys.set({ 'app-state-sync-version': { [name]: null } });
                        // increment number of retries
                        attemptsMap[name] = (attemptsMap[name] || 0) + 1;
                        // if retry attempts overshoot
                        // or key not found
                        if (attemptsMap[name] >= MAX_SYNC_ATTEMPTS || ((_a = error.output) === null || _a === void 0 ? void 0 : _a.statusCode) === 404) {
                            // stop retrying
                            collectionsToHandle.delete(name);
                        }
                    }
                }
            }
        });
        processSyncActionsLocal(appStateChunk.totalMutations);
        return appStateChunk;
    };
    /**
     * fetch the profile picture of a user/group
     * type = "preview" for a low res picture
     * type = "image for the high res picture"
     */
    const profilePictureUrl = async (jid, type = 'preview', timeoutMs) => {
        var _a;
        jid = WABinary_1.jidNormalizedUser(jid);
        const result = await query({
            tag: 'iq',
            attrs: {
                to: jid,
                type: 'get',
                xmlns: 'w:profile:picture'
            },
            content: [
                { tag: 'picture', attrs: { type, query: 'url' } }
            ]
        }, timeoutMs);
        const child = WABinary_1.getBinaryNodeChild(result, 'picture');
        return (_a = child === null || child === void 0 ? void 0 : child.attrs) === null || _a === void 0 ? void 0 : _a.url;
    };
    const sendPresenceUpdate = async (type, toJid) => {
        const me = authState.creds.me;
        if (type === 'available' || type === 'unavailable') {
            if (!me.name) {
                logger.warn('no name present, ignoring presence update request...');
                return;
            }
            await sendNode({
                tag: 'presence',
                attrs: {
                    name: me.name,
                    type
                }
            });
        }
        else {
            await sendNode({
                tag: 'chatstate',
                attrs: {
                    from: me.id,
                    to: toJid,
                },
                content: [
                    {
                        tag: type === 'recording' ? 'composing' : type,
                        attrs: type === 'recording' ? { media: 'audio' } : {}
                    }
                ]
            });
        }
    };
    const presenceSubscribe = (toJid) => (sendNode({
        tag: 'presence',
        attrs: {
            to: toJid,
            id: generateMessageTag(),
            type: 'subscribe'
        }
    }));
    const handlePresenceUpdate = ({ tag, attrs, content }) => {
        var _a;
        let presence;
        const jid = attrs.from;
        const participant = attrs.participant || attrs.from;
        if (tag === 'presence') {
            presence = {
                lastKnownPresence: attrs.type === 'unavailable' ? 'unavailable' : 'available',
                lastSeen: attrs.last ? +attrs.last : undefined
            };
        }
        else if (Array.isArray(content)) {
            const [firstChild] = content;
            let type = firstChild.tag;
            if (type === 'paused') {
                type = 'available';
            }
            if (((_a = firstChild.attrs) === null || _a === void 0 ? void 0 : _a.media) === 'audio') {
                type = 'recording';
            }
            presence = { lastKnownPresence: type };
        }
        else {
            logger.error({ tag, attrs, content }, 'recv invalid presence node');
        }
        if (presence) {
            ev.emit('presence.update', { id: jid, presences: { [participant]: presence } });
        }
    };
    const resyncMainAppState = async () => {
        logger.debug('resyncing main app state');
        await (mutationMutex.mutex(() => resyncAppState([
            'critical_block',
            'critical_unblock_low',
            'regular_high',
            'regular_low',
            'regular'
        ]))
            .catch(err => (onUnexpectedError(err, 'main app sync'))));
    };
    const processSyncActionsLocal = (actions) => {
        const events = Utils_1.processSyncActions(actions, authState.creds.me, logger);
        emitEventsFromMap(events);
    };
    const appPatch = async (patchCreate) => {
        const name = patchCreate.type;
        const myAppStateKeyId = authState.creds.myAppStateKeyId;
        if (!myAppStateKeyId) {
            throw new boom_1.Boom('App state key not present!', { statusCode: 400 });
        }
        await mutationMutex.mutex(async () => {
            logger.debug({ patch: patchCreate }, 'applying app patch');
            await resyncAppState([name]);
            let { [name]: initial } = await authState.keys.get('app-state-sync-version', [name]);
            initial = initial || Utils_1.newLTHashState();
            const { patch, state } = await Utils_1.encodeSyncdPatch(patchCreate, myAppStateKeyId, initial, getAppStateSyncKey);
            const node = {
                tag: 'iq',
                attrs: {
                    to: WABinary_1.S_WHATSAPP_NET,
                    type: 'set',
                    xmlns: 'w:sync:app:state'
                },
                content: [
                    {
                        tag: 'sync',
                        attrs: {},
                        content: [
                            {
                                tag: 'collection',
                                attrs: {
                                    name,
                                    version: (state.version - 1).toString(),
                                    return_snapshot: 'false'
                                },
                                content: [
                                    {
                                        tag: 'patch',
                                        attrs: {},
                                        content: WAProto_1.proto.SyncdPatch.encode(patch).finish()
                                    }
                                ]
                            }
                        ]
                    }
                ]
            };
            await query(node);
            await authState.keys.set({ 'app-state-sync-version': { [name]: state } });
            if (config.emitOwnEvents) {
                const result = await Utils_1.decodePatches(name, [{ ...patch, version: { version: state.version }, }], initial, getAppStateSyncKey);
                processSyncActionsLocal(result.newMutations);
            }
        });
    };
    /** sending abt props may fix QR scan fail if server expects */
    const fetchAbt = async () => {
        const abtNode = await query({
            tag: 'iq',
            attrs: {
                to: WABinary_1.S_WHATSAPP_NET,
                xmlns: 'abt',
                type: 'get',
                id: generateMessageTag(),
            },
            content: [
                { tag: 'props', attrs: { protocol: '1' } }
            ]
        });
        const propsNode = WABinary_1.getBinaryNodeChild(abtNode, 'props');
        let props = {};
        if (propsNode) {
            props = WABinary_1.reduceBinaryNodeToDictionary(propsNode, 'prop');
        }
        logger.debug('fetched abt');
        return props;
    };
    /** sending non-abt props may fix QR scan fail if server expects */
    const fetchProps = async () => {
        const resultNode = await query({
            tag: 'iq',
            attrs: {
                to: WABinary_1.S_WHATSAPP_NET,
                xmlns: 'w',
                type: 'get',
                id: generateMessageTag(),
            },
            content: [
                { tag: 'props', attrs: {} }
            ]
        });
        const propsNode = WABinary_1.getBinaryNodeChild(resultNode, 'props');
        let props = {};
        if (propsNode) {
            props = WABinary_1.reduceBinaryNodeToDictionary(propsNode, 'prop');
        }
        logger.debug('fetched props');
        return props;
    };
    /**
     * modify a chat -- mark unread, read etc.
     * lastMessages must be sorted in reverse chronologically
     * requires the last messages till the last message received; required for archive & unread
    */
    const chatModify = (mod, jid) => {
        const patch = Utils_1.chatModificationToAppPatch(mod, jid);
        return appPatch(patch);
    };
    /**
     * queries need to be fired on connection open
     * help ensure parity with WA Web
     * */
    const fireInitQueries = async () => {
        await Promise.all([
            fetchAbt(),
            fetchProps(),
            fetchBlocklist(),
            fetchPrivacySettings(),
            sendPresenceUpdate('available')
        ]);
    };
    ws.on('CB:presence', handlePresenceUpdate);
    ws.on('CB:chatstate', handlePresenceUpdate);
    ws.on('CB:ib,,dirty', async (node) => {
        const { attrs } = WABinary_1.getBinaryNodeChild(node, 'dirty');
        const type = attrs.type;
        switch (type) {
            case 'account_sync':
                if (attrs.timestamp) {
                    let { lastAccountSyncTimestamp } = authState.creds;
                    if (lastAccountSyncTimestamp) {
                        await updateAccountSyncTimestamp(lastAccountSyncTimestamp);
                    }
                    lastAccountSyncTimestamp = +attrs.timestamp;
                    ev.emit('creds.update', { lastAccountSyncTimestamp });
                }
                break;
            default:
                logger.info({ node }, 'received unknown sync');
                break;
        }
    });
    ws.on('CB:notification,type:server_sync', (node) => {
        const update = WABinary_1.getBinaryNodeChild(node, 'collection');
        if (update) {
            const name = update.attrs.name;
            mutationMutex.mutex(async () => {
                await resyncAppState([name])
                    .catch(err => logger.error({ trace: err.stack, node }, 'failed to sync state'));
            });
        }
    });
    ev.on('connection.update', ({ connection }) => {
        if (connection === 'open') {
            fireInitQueries()
                .catch(error => onUnexpectedError(error, 'connection open requests'));
        }
    });
    return {
        ...sock,
        appPatch,
        sendPresenceUpdate,
        presenceSubscribe,
        profilePictureUrl,
        onWhatsApp,
        fetchBlocklist,
        fetchStatus,
        updateProfilePicture,
        updateBlockStatus,
        getBusinessProfile,
        resyncAppState,
        chatModify,
        resyncMainAppState,
    };
};
exports.makeChatsSocket = makeChatsSocket;
