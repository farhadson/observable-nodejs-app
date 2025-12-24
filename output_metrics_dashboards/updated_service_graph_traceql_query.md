### service_namespace="demo"
label_join(
  label_join(
    label_join(
      sum(increase(traces_service_graph_request_total{service_namespace="demo", server=~"$server", client=~"$client"}[5m])) by (server, client) > 0
      or
      sum(increase(traces_service_graph_request_total{service_namespace="demo", server=~"$server", client=~"$client"}[5m])) by (server, client) > 0,
      "source", "", "client"
    ),
    "target", "", "server"
  ),
  "id", "-", "server", "client"
)
