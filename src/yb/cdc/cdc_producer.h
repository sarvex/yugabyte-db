// Copyright (c) YugaByte, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.  You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under the License
// is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
// or implied.  See the License for the specific language governing permissions and limitations
// under the License.

#pragma once

#include <memory>
#include <shared_mutex>
#include <string>

#include <boost/functional/hash.hpp>
#include <boost/unordered_map.hpp>

#include "yb/cdc/cdc_service.service.h"
#include "yb/client/client_fwd.h"
#include "yb/common/common_fwd.h"
#include "yb/common/transaction.h"
#include "yb/consensus/consensus_fwd.h"
#include "yb/docdb/docdb.pb.h"
#include "yb/tablet/tablet_fwd.h"
#include "yb/util/monotime.h"
#include "yb/util/opid.h"
#include "yb/master/master_replication.pb.h"
#include "yb/gutil/thread_annotations.h"

namespace yb {

class MemTracker;

namespace cdc {

using EnumOidLabelMap = std::unordered_map<uint32_t, std::string>;
using EnumLabelCache = std::unordered_map<NamespaceName, EnumOidLabelMap>;

using CompositeAttsMap = std::unordered_map<uint32_t, std::vector<master::PgAttributePB>>;
using CompositeTypeCache = std::unordered_map<NamespaceName, CompositeAttsMap>;

struct SchemaDetails {
  SchemaVersion schema_version;
  std::shared_ptr<Schema> schema;
};
// We will maintain a map for each stream, tablet pait. The schema details will correspond to the
// the current 'running' schema.
using SchemaDetailsMap = std::map<TableId, SchemaDetails>;

struct StreamMetadata {
  NamespaceId ns_id;
  std::vector<TableId> table_ids;
  CDCRecordType record_type;
  CDCRecordFormat record_format;
  CDCRequestSource source_type;
  CDCCheckpointType checkpoint_type;

  struct StreamTabletMetadata {
    std::mutex mutex_;
    int64_t apply_safe_time_checkpoint_op_id_ GUARDED_BY(mutex_) = 0;
    HybridTime last_apply_safe_time_ GUARDED_BY(mutex_);
    MonoTime last_apply_safe_time_update_time_ GUARDED_BY(mutex_);
    // TODO(hari): #16774 Move last_readable_index and last sent opid here, and use it to make
    // UpdateCDCTabletMetrics run asynchronously.
  };

  StreamMetadata() = default;

  StreamMetadata(NamespaceId ns_id,
                 std::vector<TableId> table_ids,
                 CDCRecordType record_type,
                 CDCRecordFormat record_format,
                 CDCRequestSource source_type,
                 CDCCheckpointType checkpoint_type)
      : ns_id(std::move(ns_id)),
        table_ids((std::move(table_ids))),
        record_type(record_type),
        record_format(record_format),
        source_type(source_type),
        checkpoint_type(checkpoint_type) {
  }

  std::shared_ptr<StreamTabletMetadata> GetTabletMetadata(const TabletId& tablet_id)
      EXCLUDES(tablet_metadata_map_mutex_);

 private:
  std::shared_mutex tablet_metadata_map_mutex_;
  std::unordered_map<TableId, std::shared_ptr<StreamTabletMetadata>> tablet_metadata_map_
      GUARDED_BY(tablet_metadata_map_mutex_);
};

Status GetChangesForCDCSDK(
    const CDCStreamId& stream_id,
    const TableId& tablet_id,
    const CDCSDKCheckpointPB& op_id,
    const StreamMetadata& record,
    const std::shared_ptr<tablet::TabletPeer>& tablet_peer,
    const std::shared_ptr<MemTracker>& mem_tracker,
    const EnumOidLabelMap& enum_oid_label_map,
    const CompositeAttsMap& composite_atts_map,
    client::YBClient* client,
    consensus::ReplicateMsgsHolder* msgs_holder,
    GetChangesResponsePB* resp,
    uint64_t* commit_timestamp,
    SchemaDetailsMap* cached_schema_details,
    OpId* last_streamed_op_id,
    int64_t* last_readable_opid_index = nullptr,
    const TableId& colocated_table_id = "",
    const CoarseTimePoint deadline = CoarseTimePoint::max());

using UpdateOnSplitOpFunc = std::function<Status(const consensus::ReplicateMsg&)>;

Status GetChangesForXCluster(
    const std::string& stream_id,
    const std::string& tablet_id,
    const OpId& op_id,
    const std::shared_ptr<tablet::TabletPeer>& tablet_peer,
    const client::YBSessionPtr& session,
    UpdateOnSplitOpFunc update_on_split_op_func,
    const std::shared_ptr<MemTracker>& mem_tracker,
    StreamMetadata* stream_metadata,
    consensus::ReplicateMsgsHolder* msgs_holder,
    GetChangesResponsePB* resp,
    int64_t* last_readable_opid_index = nullptr,
    const CoarseTimePoint deadline = CoarseTimePoint::max());
}  // namespace cdc
}  // namespace yb
