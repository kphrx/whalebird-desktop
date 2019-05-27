import Mastodon, { Account, Relationship, Response } from 'megalodon'
import Timeline, { TimelineState } from './AccountProfile/Timeline'
import Follows, { FollowsState } from './AccountProfile/Follows'
import Followers, { FollowersState } from './AccountProfile/Followers'
import { Module, MutationTree, ActionTree } from 'vuex'
import { RootState } from '@/store'

export interface AccountProfileState {
  account: Account | null
  relationship: Relationship | null
  loading: boolean
}

export interface AccountProfileModuleState extends AccountProfileState {
  Followers: FollowersState
  Follows: FollowsState
  Timeline: TimelineState
}

const state = (): AccountProfileState => ({
  account: null,
  relationship: null,
  loading: false
})

export const MUTATION_TYPES = {
  CHANGE_ACCOUNT: 'changeAccount',
  CHANGE_RELATIONSHIP: 'changeRelationship',
  CHANGE_LOADING: 'changeLoading'
}

const mutations: MutationTree<AccountProfileState> = {
  [MUTATION_TYPES.CHANGE_ACCOUNT]: (state, account: Account | null) => {
    state.account = account
  },
  [MUTATION_TYPES.CHANGE_RELATIONSHIP]: (state, relationship: Relationship | null) => {
    state.relationship = relationship
  },
  [MUTATION_TYPES.CHANGE_LOADING]: (state, value: boolean) => {
    state.loading = value
  }
}

const actions: ActionTree<AccountProfileState, RootState> = {
  fetchAccount: async ({ rootState }, accountID: string): Promise<Account> => {
    const client = new Mastodon(rootState.TimelineSpace.account.accessToken!, rootState.TimelineSpace.account.baseURL + '/api/v1')
    const res: Response<Account> = await client.get<Account>(`/accounts/${accountID}`)
    return res.data
  },
  searchAccount: async ({ rootState }, parsedAccount): Promise<Account> => {
    const client = new Mastodon(rootState.TimelineSpace.account.accessToken!, rootState.TimelineSpace.account.baseURL + '/api/v1')
    const res: Response<Array<Account>> = await client.get<Array<Account>>('/accounts/search', { q: parsedAccount.url, resolve: true })
    if (res.data.length <= 0) throw new AccountNotFound('empty result')
    const account = res.data.find(a => `@${a.acct}` === parsedAccount.acct)
    if (account) return account
    const pleromaUser = res.data.find(a => a.acct === parsedAccount.acct)
    if (pleromaUser) return pleromaUser
    const localUser = res.data.find(a => `@${a.username}@${rootState.TimelineSpace.account.domain}` === parsedAccount.acct)
    if (localUser) return localUser
    const user = res.data.find(a => a.url === parsedAccount.url)
    if (!user) throw new AccountNotFound('not found')
    return user
  },
  changeAccount: ({ commit, dispatch }, account: Account) => {
    dispatch('fetchRelationship', account)
    commit(MUTATION_TYPES.CHANGE_ACCOUNT, account)
  },
  fetchRelationship: async ({ commit, rootState }, account: Account): Promise<Relationship> => {
    commit(MUTATION_TYPES.CHANGE_RELATIONSHIP, null)
    const client = new Mastodon(rootState.TimelineSpace.account.accessToken!, rootState.TimelineSpace.account.baseURL + '/api/v1')
    const res: Response<Relationship> = await client.get<Relationship>('/accounts/relationships', { id: [account.id] })
    commit(MUTATION_TYPES.CHANGE_RELATIONSHIP, res.data[0])
    return res.data
  },
  follow: async ({ commit, rootState }, account: Account) => {
    const client = new Mastodon(rootState.TimelineSpace.account.accessToken!, rootState.TimelineSpace.account.baseURL + '/api/v1')
    const res: Response<Relationship> = await client.post<Relationship>(`/accounts/${account.id}/follow`)
    commit(MUTATION_TYPES.CHANGE_RELATIONSHIP, res.data)
    return res.data
  },
  unfollow: async ({ commit, rootState }, account: Account) => {
    const client = new Mastodon(rootState.TimelineSpace.account.accessToken!, rootState.TimelineSpace.account.baseURL + '/api/v1')
    const res: Response<Relationship> = await client.post<Relationship>(`/accounts/${account.id}/unfollow`)
    commit(MUTATION_TYPES.CHANGE_RELATIONSHIP, res.data)
    return res.data
  },
  close: ({ commit }) => {
    commit(MUTATION_TYPES.CHANGE_ACCOUNT, null)
  },
  unmute: async ({ rootState, commit }, account: Account) => {
    const client = new Mastodon(rootState.TimelineSpace.account.accessToken!, rootState.TimelineSpace.account.baseURL + '/api/v1')
    const res: Response<Relationship> = await client.post<Relationship>(`/accounts/${account.id}/unmute`)
    commit(MUTATION_TYPES.CHANGE_RELATIONSHIP, res.data)
    return res.data
  },
  block: async ({ rootState, commit }, account: Account) => {
    const client = new Mastodon(rootState.TimelineSpace.account.accessToken!, rootState.TimelineSpace.account.baseURL + '/api/v1')
    const res: Response<Relationship> = await client.post<Relationship>(`/accounts/${account.id}/block`)
    commit(MUTATION_TYPES.CHANGE_RELATIONSHIP, res.data)
    return res.data
  },
  unblock: async ({ rootState, commit }, account: Account) => {
    const client = new Mastodon(rootState.TimelineSpace.account.accessToken!, rootState.TimelineSpace.account.baseURL + '/api/v1')
    const res: Response<Relationship> = await client.post<Relationship>(`/accounts/${account.id}/unblock`)
    commit(MUTATION_TYPES.CHANGE_RELATIONSHIP, res.data)
    return res.data
  }
}

const AccountProfile: Module<AccountProfileState, RootState> = {
  namespaced: true,
  modules: {
    Timeline,
    Follows,
    Followers
  },
  state: state,
  mutations: mutations,
  actions: actions
}

class AccountNotFound extends Error {}

export default AccountProfile
