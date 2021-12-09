module.exports = {
    apps : [
        {
            name: "ucu-test-api",
            script: "./bin/www",
            watch: true,
            ignore_watch: ["node_modules", "views", "public", "bin", "log.txt", "logs"],
            exec_mode: "cluster",
            instances: 1,
            //max_memory_restart: "200M",
            time: true,
            env: {
                "NODE_ENV": "development",
                "PORT": "4000"
            }
        }
    ]
};