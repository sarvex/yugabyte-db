import { useRef, useState, useContext } from 'react';
import _ from 'lodash';
import { useUpdateEffect } from 'react-use';
import { useQuery } from 'react-query';
import { useWatch, useFormContext } from 'react-hook-form';
import { api, QUERY_KEY } from '../../utils/api';
import { UniverseFormContext } from '../../UniverseFormContainer';
import { getUserIntent } from '../../utils/helpers';
import {
  Placement,
  Cluster,
  ClusterType,
  UniverseFormData,
  PlacementRegion,
  PlacementCloud,
  PlacementAZ
} from '../../utils/dto';
import {
  PROVIDER_FIELD,
  REGIONS_FIELD,
  PLACEMENTS_FIELD,
  TOTAL_NODES_FIELD,
  REPLICATION_FACTOR_FIELD,
  INSTANCE_TYPE_FIELD,
  DEVICE_INFO_FIELD,
  DEDICATED_NODES_FIELD,
  MASTERS_IN_DEFAULT_REGION_FIELD,
  DEFAULT_REGION_FIELD
} from '../../utils/constants';

export const getPlacementsFromCluster = (
  cluster?: Cluster,
  providerId?: string // allocated for the future, currently there's single cloud per universe only
): any[] => {
  let placements: Placement[] = [];

  if (cluster?.placementInfo?.cloudList) {
    let regions: PlacementRegion[];
    if (providerId) {
      // find exact cloud corresponding to provider ID and take its regions
      const cloud = _.find<PlacementCloud>(cluster.placementInfo.cloudList, { uuid: providerId });
      regions = cloud?.regionList || [];
    } else {
      // concat all regions for all available clouds
      regions = cluster.placementInfo.cloudList.flatMap((item) => item.regionList);
    }
    // add extra fields with parent region data
    placements = regions.flatMap<Placement>((region) => {
      return region.azList.map((zone) => ({
        ...zone,
        parentRegionId: region.uuid,
        parentRegionName: region.name,
        parentRegionCode: region.code
      }));
    });
  } else {
    console.error('Error on extracting placements from cluster', cluster);
  }

  return _.sortBy(placements, 'name');
};

export const getPlacements = (formData: UniverseFormData): PlacementRegion[] => {
  // remove gaps from placements list
  const placements: NonNullable<Placement>[] = _.cloneDeep(
    _.compact(formData.cloudConfig.placements)
  );

  const regionMap: Record<string, PlacementRegion> = {};
  placements.forEach((item) => {
    const zone: PlacementAZ = _.omit(item, [
      'parentRegionId',
      'parentRegionCode',
      'parentRegionName'
    ]);
    if (Array.isArray(regionMap[item.parentRegionId]?.azList)) {
      regionMap[item.parentRegionId].azList.push(zone);
    } else {
      regionMap[item.parentRegionId] = {
        uuid: item.parentRegionId,
        code: item.parentRegionCode,
        name: item.parentRegionName,
        azList: [zone]
      };
    }
  });

  return Object.values(regionMap);
};

export const useGetAllZones = () => {
  const [allAZ, setAllAZ] = useState<Placement[]>([]);
  const provider = useWatch({ name: PROVIDER_FIELD });
  const regionList = useWatch({ name: REGIONS_FIELD });

  const { data: allRegions } = useQuery(
    [QUERY_KEY.getRegionsList, provider?.uuid],
    () => api.getRegionsList(provider?.uuid),
    { enabled: !!provider?.uuid } // make sure query won't run when there's no provider defined
  );

  useUpdateEffect(() => {
    const selectedRegions = new Set(regionList);

    const zones = (allRegions || [])
      .filter((region) => selectedRegions.has(region.uuid))
      .flatMap<Placement>((region: any) => {
        // add extra fields with parent region data
        return region.zones.map((zone: any) => ({
          ...zone,
          parentRegionId: region.uuid,
          parentRegionName: region.name,
          parentRegionCode: region.code
        }));
      });

    setAllAZ(_.sortBy(zones, 'name'));
  }, [regionList, allRegions]);

  return allAZ;
};

export const useGetUnusedZones = (allZones: Placement[]) => {
  const [unUsedZones, setUnUsedZones] = useState<Placement[]>([]);
  const currentPlacements = useWatch({ name: PLACEMENTS_FIELD });

  useUpdateEffect(() => {
    const currentPlacementsMap = _.keyBy(currentPlacements, 'uuid');
    const unUsed = allZones.filter((item: any) => !currentPlacementsMap[item.uuid]);
    setUnUsedZones(unUsed);
  }, [allZones, currentPlacements]);

  return unUsedZones;
};

export const useNodePlacements = () => {
  const [needPlacement, setNeedPlacement] = useState(false);
  const [regionsChanged, setRegionsChanged] = useState(false);
  const { setValue, getValues } = useFormContext<UniverseFormData>();
  const [
    { universeConfigureTemplate, clusterType, mode },
    { setUniverseConfigureTemplate, setUniverseResourceTemplate }
  ] = useContext(UniverseFormContext);

  //watchers
  const regionList = useWatch({ name: REGIONS_FIELD });
  const totalNodes = useWatch({ name: TOTAL_NODES_FIELD });
  const replicationFactor = useWatch({ name: REPLICATION_FACTOR_FIELD });
  const instanceType = useWatch({ name: INSTANCE_TYPE_FIELD });
  const deviceInfo = useWatch({ name: DEVICE_INFO_FIELD });
  const dedicatedNodes = useWatch({ name: DEDICATED_NODES_FIELD });
  const defaultRegion = useWatch({ name: DEFAULT_REGION_FIELD });
  const defaultMasterRegion = useWatch({ name: MASTERS_IN_DEFAULT_REGION_FIELD });

  const prevPropsCombination = useRef({
    instanceType,
    regionList,
    totalNodes: Number(totalNodes),
    replicationFactor,
    deviceInfo,
    dedicatedNodes,
    defaultRegion,
    defaultMasterRegion
  });

  let payload: any = {};
  const userIntent = {
    ...getUserIntent({ formData: getValues() })
  };

  if (universeConfigureTemplate) {
    payload = { ...universeConfigureTemplate };
    //update the cluster intent based on cluster type
    let clusterIndex = payload.clusters.findIndex(
      (cluster: Cluster) => cluster.clusterType === clusterType
    );

    //During first Async Creation
    if (clusterIndex === -1 && clusterType === ClusterType.ASYNC)
      clusterIndex =
        payload.clusters.push({
          clusterType: ClusterType.ASYNC,
          userIntent
        }) - 1;

    if (payload.clusters[clusterIndex]?.placementInfo && getValues(PLACEMENTS_FIELD)?.length)
      payload.clusters[clusterIndex].placementInfo.cloudList[0].regionList = getPlacements(
        getValues()
      );

    payload.clusters[clusterIndex].userIntent = userIntent;
    payload['regionsChanged'] = regionsChanged;
    payload['userAZSelected'] = false;
    payload['resetAZConfig'] = false;
    payload['clusterOperation'] = mode;
    payload['currentClusterType'] = clusterType;
  } else {
    payload = {
      currentClusterType: ClusterType.PRIMARY,
      clusterOperation: mode,
      resetAZConfig: true,
      userAZSelected: false,
      clusters: [
        {
          clusterType: ClusterType.PRIMARY,
          userIntent
        }
      ]
    };
  }

  const { isFetching } = useQuery(
    [QUERY_KEY.universeConfigure, payload],
    () => api.universeConfigure(payload),
    {
      enabled:
        needPlacement &&
        totalNodes >= replicationFactor &&
        !_.isEmpty(regionList) &&
        !_.isEmpty(instanceType) &&
        !_.isEmpty(deviceInfo),
      onSuccess: async (data) => {
        const cluster = _.find(data.clusters, { clusterType });
        const zones = getPlacementsFromCluster(cluster);
        setValue(PLACEMENTS_FIELD, _.compact(zones));
        setUniverseConfigureTemplate(data);
        setRegionsChanged(false);
        setNeedPlacement(false);
        let resource = await api.universeResource(data); // set Universe resource template whenever configure is called
        setUniverseResourceTemplate(resource);
      }
    }
  );

  useUpdateEffect(() => {
    const propsCombination = {
      instanceType,
      regionList,
      totalNodes: Number(totalNodes),
      replicationFactor,
      deviceInfo,
      dedicatedNodes,
      defaultRegion,
      defaultMasterRegion
    };
    if (_.isEmpty(regionList)) {
      setValue(PLACEMENTS_FIELD, [], { shouldValidate: true });
      setNeedPlacement(false);
    } else {
      const isRegionListChanged = !_.isEqual(
        prevPropsCombination.current.regionList,
        propsCombination.regionList
      );
      const needUpdate = !_.isEqual(prevPropsCombination.current, propsCombination);
      setRegionsChanged(isRegionListChanged);
      setNeedPlacement(needUpdate);
    }

    prevPropsCombination.current = propsCombination;
  }, [instanceType, regionList, totalNodes, replicationFactor, deviceInfo]);

  return { isLoading: isFetching };
};