const { paginateResults } = require('./utils');

module.exports = {
    Query: {
        // Parent _ root, __ arguments for query, dataSources context to use methods
        launches: async (_, { pageSize = 20, after }, { dataSources }) => {
            const allLaunches = await dataSources.launchAPI.getAllLaunches();
            allLaunches.reverse();

            const launches = paginateResults({
                after,
                pageSize,
                results: allLaunches,
            });

            return {
                launches,
                cursor: launches.length ? launches[launches.length - 1].cursor: null,
                hasmore: launches.length
                    ? launches[launches.length - 1].cursor !== allLaunches[allLaunches.length -1].cursor
                    : false,
            }
        },
        launch: (_, { id }, { dataSources }) => 
            dataSources.launchAPI.getLaunchById({ launchId: id }),
        me: async (_, __, { dataSources }) => 
            dataSources.userAPI.findOrCreateUser(),
    },
    Mission: {
        missionPatch: (mission, { size } = { size: 'LARGE' }) => {
            return size === 'SMALL'
                ? missionPatchSmall
                : missionPatchLarge;
        }
    },
    Launch: {
        isBooked: async (launch, _, { dataSources }) => 
            dataSources.userAPI.isBookedOnLaunch({ launchId: launchId }),
    },
    User: {
        trips: async (_, __, { dataSources }) => {
            const launchIds = await dataSources.userAPI.getLaunchIdsByUser();

            if (!launchIds.length) return [];

            return (
                dataSources.launchAPI.getLaunchesByIds({
                    launchIds,
                }) || []
            );
        }
    },
    Mutation: {
        login: async (_, { email }, { dataSources }) => {
            const user = await dataSources.userAPI.findOrCreateUser({ email });
            if (user) return new Buffer(email).toString('base64');
        },

        bookTrips: async (_, { launchIds }, { dataSources }) => {
            const results = await dataSources.userAPI.bookTrips({ launchIds });
            const launches = await dataSources.launchAPI.getLaunchesByIds({
              launchIds,
            });
        
            return {
              success: results && results.length === launchIds.length,
              message:
                results.length === launchIds.length
                  ? 'trips booked successfully'
                  : `the following launches couldn't be booked: ${launchIds.filter(
                      id => !results.includes(id),
                    )}`,
              launches,
            };
          },

          cancelTrip: async (_, { launchId }, { dataSources }) => {
            const result = dataSources.userAPI.cancelTrip({ launchId });
        
            if (!result)
              return {
                success: false,
                message: 'failed to cancel trip',
              };
        
            const launch = await dataSources.launchAPI.getLaunchById({ launchId });
            return {
              success: true,
              message: 'trip cancelled',
              launches: [launch],
            };
          },
    }
}