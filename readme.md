# Distributed Server Mesh Prototype

This project is a functional demonstration of a partitioned server mesh architecture, focusing on authoritative spatial networking and unified state replication.

## Technical Architecture
The system is designed to simulate a seamless world by dividing a 2D coordinate space into authoritative zones.

* **Authoritative Partitioning:** The environment is split into four quadrants. Each quadrant is managed by a standalone simulation process responsible for physics and logic within its boundaries.
* **Unified Replication Layer:** A centralized Redis instance acts as the shared state store. All simulation nodes write to this layer, while a gateway service broadcasts updates to connected clients.
* **Interest Management (Ghosting):** To handle boundary transitions, the client implements a toggleable buffer zone. This allows the client to render entities located in neighboring authoritative zones as semi-transparent "ghost" proxies.


## Environment Setup

This project utilizes Conda for environment and dependency management.

1.  **Create the environment:**
    ```bash
    conda env create -f environment.yml
    ```

2.  **Activate the environment:**
    ```bash
    conda activate mini-mesh
    ```

3.  **Install Node.js dependencies:**
    ```bash
    npm install
    ```

## Configuration
The application requires a `.env` file in the root directory to manage connection parameters. This file is excluded from version control to protect credentials.

Create a file named `.env` and include the following:

```text
# Replication Layer (Redis)
REDIS_HOST= your-redis-host
REDIS_PORT= your-redis-port
REDIS_PASSWORD=your-redis-password
```

## Startup Instructions

1. **Verify the Replication Layer**

Before launching the mesh, ensure your Node.js environment can successfully connect to Redis using the custom ping script:
```bash
    node ping.js
```

2. **Launch the Mesh**

Run the following command to initialize the gateway and all four simulation nodes simultaneously using concurrently:
```bash
    npm run start-mesh
```

3. **Usage and Monitoring**
Once the services are active, view the orchestration via the browser: http://localhost:3000/dashboard.html

- Global View: The central viewport displays the unified replication state.
- Monitor Nodes: Slides out the diagnostic panel to view individual server authoritative states.
- Debug Ghosting: Toggle to enable/disable the replication buffer zone for boundary transitions.
