### (_bucket,_count,_sum) are available in histogram metrics, e.g:
- traces_service_graph_request_client_seconds_bucket
- traces_service_graph_request_client_seconds_count
- traces_service_graph_request_client_seconds_sum

# Span metrics:
- metric {name: "traces_spanmetrics_calls_total", type: "counter", labels: "__metrics_gen_instance, instance, job, service, span_kind, span_name, status_code"}
- ​metric {name: "traces_spanmetrics_latency", type: "histogram", labels: "__metrics_gen_instance, instance, job, service, span_kind, span_name, status_code, le"}
- ​metric {name: "traces_spanmetrics_size_total", type: "counter", labels: "__metrics_gen_instance, instance, job, service, span_kind, span_name, status_code"}

### Span metrics have the label: ​service="tracing-app-dev"

# Service graph metrics:
- metric {name: "traces_service_graph_request_total", type: "counter", labels: "__metrics_gen_instance, instance, job, client, server, connection_type"}
- metric {name: "traces_service_graph_request_client_seconds", type: "histogram", labels: "__metrics_gen_instance, instance, job, client, server, connection_type, le"}
- metric {name: "traces_service_graph_request_server_seconds", type: "histogram", labels: "__metrics_gen_instance, instance, job, client, server, connection_type, le"}
​
### Service graph metrics can have the label: service_namespace="demo"

### how to aquire

```bash 
 cat output_metrics_dashboards/sample_red_metrics2.ini | awk -F '{' '{print $1}' | sort | uniq -c
```

```promql
    count by (__name__) ({job="tempo-metrics-generator",service=~"vira-app-launcher"})
```

