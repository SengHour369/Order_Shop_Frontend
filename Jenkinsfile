// Requires a Linux Docker agent and the Docker Pipeline plugin.
pipeline {
    agent { label 'linux && docker' }
    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        skipStagesAfterUnstable()
        timestamps()
        timeout(time: 60, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '5'))
    }
    parameters {
        booleanParam(name: 'BUILD_IMAGES', defaultValue: false,
            description: 'Build local Docker images after successful tests; no push or deployment.')
    }
    environment { CI = 'true' }
    stages {
        stage('Checkout') {
            steps {
                deleteDir()
                checkout scm
                script {
                    env.IMAGE_TAG = "${sh(script: 'git rev-parse --short=12 HEAD', returnStdout: true).trim()}-${env.BUILD_NUMBER}"
                }
            }
        }
        stage('Install, test and build') {
            agent {
                docker {
                    image 'node:24-alpine'
                    reuseNode true
                }
            }
            steps {
                sh 'npm ci --cache .npm-cache --no-audit --no-fund'
                sh 'mkdir -p reports'
                sh 'npm test -- --reporters=junit --output-file=reports/frontend.xml'
                sh 'npm run build -- --configuration=production'
                sh 'tar -czf frontend-dist.tar.gz -C dist/e-shop/browser .'
                archiveArtifacts artifacts: 'frontend-dist.tar.gz', fingerprint: true
            }
            post {
                always {
                    junit testResults: 'reports/frontend.xml', allowEmptyResults: false
                }
            }
        }
        stage('Build Docker image') {
            when { expression { params.BUILD_IMAGES } }
            steps {
                sh 'docker build --pull --tag "eshop/frontend:$IMAGE_TAG" .'
            }
        }
    }
    post { cleanup { deleteDir() } }
}
