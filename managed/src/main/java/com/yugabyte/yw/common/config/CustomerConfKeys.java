/*
 * Copyright 2022 YugaByte, Inc. and Contributors
 *
 * Licensed under the Polyform Free Trial License 1.0.0 (the "License"); you
 * may not use this file except in compliance with the License. You
 * may obtain a copy of the License at
 *
 * http://github.com/YugaByte/yugabyte-db/blob/master/licenses/POLYFORM-FREE-TRIAL-LICENSE-1.0.0.txt
 */

package com.yugabyte.yw.common.config;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.SetMultimap;
import com.yugabyte.yw.common.config.ConfKeyInfo.ConfKeyTags;
import com.yugabyte.yw.forms.RuntimeConfigFormData.ScopedConfig.ScopeType;
import java.time.Duration;

public class CustomerConfKeys extends RuntimeConfigKeysModule {

  public static final ConfKeyInfo<Duration> taskGcRetentionDuration =
      new ConfKeyInfo<>(
          "yb.taskGC.task_retention_duration",
          ScopeType.CUSTOMER,
          "Task Garbage Collection Retention Duration",
          "We garbage collect stale tasks after this duration",
          ConfDataType.DurationType,
          ImmutableList.of(ConfKeyTags.PUBLIC));
  public static final ConfKeyInfo<Boolean> isAuthEnforced =
      new ConfKeyInfo<>(
          "yb.universe.auth.is_enforced",
          ScopeType.CUSTOMER,
          "Enforce Auth",
          "Enforces users to enter password for YSQL/YCQL during Universe creation",
          ConfDataType.BooleanType,
          ImmutableList.of(ConfKeyTags.PUBLIC));
  public static final ConfKeyInfo<Boolean> isDedicatedNodesEnabled =
      new ConfKeyInfo<>(
          "yb.ui.enable_dedicated_nodes",
          ScopeType.CUSTOMER,
          "Enable dedicated nodes",
          "Gives the option to place master and tserver nodes separately "
              + "during create/edit universe",
          ConfDataType.BooleanType,
          ImmutableList.of(ConfKeyTags.PUBLIC));
  public static final ConfKeyInfo<Integer> taskDbQueryLimit =
      new ConfKeyInfo<>(
          "yb.customer_task_db_query_limit",
          ScopeType.CUSTOMER,
          "Max Number of Customer Tasks to fetch",
          "Knob that can be used when there are too many customer tasks"
              + " overwhelming the server",
          ConfDataType.IntegerType,
          ImmutableList.of(ConfKeyTags.PUBLIC));
  // Todo shashank
  public static final ConfKeyInfo<Duration> proxyEndpointTimeout =
      new ConfKeyInfo<>(
          "yb.proxy_endpoint_timeout",
          ScopeType.CUSTOMER,
          "Proxy Endpoint Timeout",
          "todo",
          ConfDataType.DurationType,
          ImmutableList.of(ConfKeyTags.BETA));

  public static final ConfKeyInfo<Duration> perfRecommendationRetentionDuration =
      new ConfKeyInfo<>(
          "yb.perf_advisor.cleanup.rec_retention_duration",
          ScopeType.CUSTOMER,
          "Perf Recommendation Collection Retention Duration",
          "Conf key that represents the duration of time the perf-advisor recommendation is valid. "
              + "Once this duration is exceeded, the recommendation entry is marked"
              + " as stale and deleted.",
          ConfDataType.DurationType,
          ImmutableList.of(ConfKeyTags.INTERNAL));

  public static final ConfKeyInfo<Duration> perfAdvisorRunRetentionDuration =
      new ConfKeyInfo<>(
          "yb.perf_advisor.cleanup.pa_run_retention_duration",
          ScopeType.CUSTOMER,
          "Perf Advisor Run Retention Duration",
          "Conf key that represents the duration of time the perf-advisor run is valid. "
              + "Once this duration is exceeded, PA run entry is deleted.",
          ConfDataType.DurationType,
          ImmutableList.of(ConfKeyTags.INTERNAL));

  public static final ConfKeyInfo<Boolean> showUICost =
      new ConfKeyInfo<>(
          "yb.ui.show_cost",
          ScopeType.CUSTOMER,
          "Show costs in UI",
          "Option to enable/disable costs in UI",
          ConfDataType.BooleanType,
          ImmutableList.of(ConfKeyTags.PUBLIC));

  public static final ConfKeyInfo<Duration> downloadHelmChartHttpTimeout =
      new ConfKeyInfo<>(
          "yb.releases.download_helm_chart_http_timeout",
          ScopeType.CUSTOMER,
          "Helm chart http download timeout",
          "The timeout for downloading the Helm chart while importing a release using HTTP",
          ConfDataType.DurationType,
          ImmutableList.of(ConfKeyTags.PUBLIC));

  public static final ConfKeyInfo<Boolean> useNewProviderUI =
      new ConfKeyInfo<>(
          "yb.ui.feature_flags.provider_redesign",
          ScopeType.CUSTOMER,
          "Use Redesigned Provider UI",
          "The redesigned provider UI adds a provider list view, a provider details "
              + "view and improves the provider creation form for AWS, AZU, GCP, and K8s",
          ConfDataType.BooleanType,
          ImmutableList.of(ConfKeyTags.PUBLIC));
  public static final ConfKeyInfo<Boolean> useK8CustomResources =
      new ConfKeyInfo<>(
          "yb.ui.feature_flags.k8s_custom_resources",
          ScopeType.CUSTOMER,
          "Use K8 custom resources",
          "Allows user to select custom K8 memory(GB) and cpu cores",
          ConfDataType.BooleanType,
          ImmutableList.of(ConfKeyTags.PUBLIC));
  public static final ConfKeyInfo<Boolean> enforceUserTags =
      new ConfKeyInfo<>(
          "yb.universe.user_tags.is_enforced",
          ScopeType.CUSTOMER,
          "Enforce User Tags",
          "Prevents universe creation when the enforced tags are not provided.",
          ConfDataType.BooleanType,
          ImmutableList.of(ConfKeyTags.PUBLIC));

  public static final ConfKeyInfo<SetMultimap> enforcedUserTagsMap =
      new ConfKeyInfo<>(
          "yb.universe.user_tags.enforced_tags",
          ScopeType.CUSTOMER,
          "Enforced User Tags List",
          "A list of enforced user tag and accepted value pairs during universe creation. "
              + "Pass '*' to accept all values for a tag."
              + " Ex: [\"yb_task:dev\",\"yb_task:test\",\"yb_owner:*\",\"yb_dept:eng\","
              + "\"yb_dept:qa\", \"yb_dept:product\", \"yb_dept:sales\"]",
          ConfDataType.KeyValuesSetMultimapType,
          ImmutableList.of(ConfKeyTags.PUBLIC));
}
