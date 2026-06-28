import { baseApi } from '../../app/api/baseApi'

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation({
      query: (body) => ({ url: '/auth/login/', method: 'POST', body }),
    }),
    register: build.mutation({
      query: (body) => ({ url: '/auth/register/', method: 'POST', body }),
    }),
    me: build.query({
      query: () => '/auth/me/',
    }),
  }),
})

export const { useLoginMutation, useRegisterMutation, useMeQuery } = authApi
